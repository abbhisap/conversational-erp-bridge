import dotenv from "dotenv";
dotenv.config();
import fastify from "fastify";
import axios from "axios";
import { SAPMockAdapter } from "./adapters/sap-mock.adapter";
import { SessionManager } from "./session/session.manager";
import { ConversationFlow } from "./session/conversation.flow";
import { config } from "./config";

const server = fastify({ logger: true });
const sap = new SAPMockAdapter();
const sessions = new SessionManager();

// ─── WHATSAPP SENDER ──────────────────────────────────────────────────────────

async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  try {
    await axios.post(
      `https://graph.facebook.com/v20.0/${config.WHATSAPP.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body: message }
      },
      {
        headers: {
          Authorization: `Bearer ${config.WHATSAPP.TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log(`✅ Message sent to ${to}`);
  } catch (error: any) {
    console.error(`❌ Failed to send message:`, error.response?.data || error.message);
  }
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

server.get("/health", async () => {
  return { status: "OK", sap_mode: config.SAP_MODE };
});

server.get("/webhook", async (request, reply) => {
  const query = request.query as any;
  const mode      = query["hub.mode"];
  const token     = query["hub.verify_token"];
  const challenge = query["hub.challenge"];

  if (mode === "subscribe" && token === config.WHATSAPP.VERIFY_TOKEN) {
    return reply.status(200).send(challenge);
  }
  return reply.status(403).send("Forbidden");
});

server.post("/webhook", async (request, reply) => {
  reply.status(200).send("OK");

  try {
    const body = request.body as any;
    const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages;
    if (!messages || messages.length === 0) return;

    // Create flow engine fresh per request
    const flow = new ConversationFlow(sessions, sap, sendWhatsAppMessage);

    for (const message of messages) {
      if (message.type !== "text") {
        await sendWhatsAppMessage(
          message.from,
          "⚠️ I can only process text commands. Type *HELP* to see available commands."
        );
        continue;
      }
      // All routing now handled by ConversationFlow
      await flow.handle(message.from, message.text.body);
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
  }
});

// ─── START ────────────────────────────────────────────────────────────────────

const start = async () => {
  try {
    await sap.connect();
    await sessions.connect();
    await server.listen({ port: 3000, host: "0.0.0.0" });
    console.log("🚀 Server running at http://localhost:3000");
    console.log("📦 Redis session manager connected");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();