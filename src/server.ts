import dotenv from "dotenv";
dotenv.config();
import fastify from "fastify";
import axios from "axios";
import { SAPMockAdapter } from "./adapters/sap-mock.adapter";
import { config } from "./config";

const server = fastify({ logger: true });
const sap = new SAPMockAdapter();

// ─── WHATSAPP SENDER ─────────────────────────────────────────────────────────

async function sendWhatsAppMessage(to: string, message: string) {
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

// ─── SAP ERROR TRANSLATOR ─────────────────────────────────────────────────────

function translateSAPError(sapMessage: string): string {
  if (sapMessage.toLowerCase().includes("already exists"))
    return "This Project ID is already taken. Please use a different ID.";
  if (sapMessage.toLowerCase().includes("does not exist"))
    return "Project not found in SAP. Please check the ID and try again.";
  if (sapMessage.toLowerCase().includes("company code"))
    return "The Company Code is invalid. Please check and try again.";
  return `SAP Error: ${sapMessage}`;
}

// ─── COMMAND PROCESSOR ───────────────────────────────────────────────────────

async function processCommand(from: string, text: string) {
  const clean = text.trim();
  console.log(`[CMD] From: ${from} | Text: "${clean}"`);

  // ── HELP ──────────────────────────────────────────────────────────────────
  if (/^(help|hi|hello|start)$/i.test(clean)) {
    await sendWhatsAppMessage(from,
      `👋 Welcome to *SAP Project System Bot*!\n\n` +
      `Here's what you can do:\n\n` +
      `*📁 Create Project:*\n` +
      `CREATE PROJECT P-2024-005 "Description" CC:1000 CA:A000 PLANT:1001\n\n` +
      `*🔍 Get Project Info:*\n` +
      `GET PROJECT P-2024-001\n\n` +
      `*✅ Release Project:*\n` +
      `RELEASE P-2024-001\n\n` +
      `*🏁 Technical Completion:*\n` +
      `TECO P-2024-001\n\n` +
      `Type *HELP* anytime to see this menu.`
    );
    return;
  }

  // ── GET PROJECT ───────────────────────────────────────────────────────────
  if (/^(get|info|status|gp)\s+(project\s+)?([A-Z0-9\-_]+)$/i.test(clean)) {
    const match = clean.match(/([A-Z0-9\-_]+)$/i);
    if (!match) { await sendWhatsAppMessage(from, "⚠️ Please provide a Project ID. Example:\nGET PROJECT P-2024-001"); return; }

    const projectId = match[1].toUpperCase();
    await sendWhatsAppMessage(from, `🔍 Fetching project *${projectId}*...`);

    const result = await sap.getProjectInfo(projectId);
    if (result.success) {
      const d = result.PROJECT_DEFINITION_DATA;
      await sendWhatsAppMessage(from,
        `📋 *Project Details*\n\n` +
        `*ID:* ${d.PSPID}\n` +
        `*Description:* ${d.POST1}\n` +
        `*Status:* ${d.ASTNA}\n` +
        `*Company Code:* ${d.VBUKR}\n` +
        `*Controlling Area:* ${d.KOKRS}\n` +
        `*Plant:* ${d.WERKS}\n` +
        `*Start Date:* ${d.PLFAZ}\n` +
        `*End Date:* ${d.PLSEZ}`
      );
    } else {
      await sendWhatsAppMessage(from, `❌ *Error*\n\n${translateSAPError(result.RETURN[0]?.MESSAGE || "Unknown error")}`);
    }
    return;
  }

  // ── CREATE PROJECT ────────────────────────────────────────────────────────
  if (/^(create|new|cp)\s+(project\s+)?/i.test(clean)) {
    const idMatch    = clean.match(/(?:create|new|cp)\s+(?:project\s+)?([A-Z0-9\-_]+)/i);
    const descMatch  = clean.match(/"([^"]+)"/);
    const ccMatch    = clean.match(/CC:(\w+)/i);
    const caMatch    = clean.match(/CA:(\w+)/i);
    const plantMatch = clean.match(/PLANT:(\w+)/i);

    const missing: string[] = [];
    if (!idMatch)    missing.push("Project ID (e.g. P-2024-005)");
    if (!descMatch)  missing.push('Description in quotes (e.g. "Highway Bridge")');
    if (!ccMatch)    missing.push("Company Code (e.g. CC:1000)");
    if (!caMatch)    missing.push("Controlling Area (e.g. CA:A000)");
    if (!plantMatch) missing.push("Plant (e.g. PLANT:1001)");

    if (missing.length > 0) {
      await sendWhatsAppMessage(from,
        `⚠️ *Missing Information*\n\nPlease provide:\n` +
        missing.map(m => `  • ${m}`).join("\n") +
        `\n\nType *HELP* to see the correct format.`
      );
      return;
    }

    const projectId = idMatch![1].toUpperCase();
    await sendWhatsAppMessage(from, `⏳ Creating project *${projectId}* in SAP...`);

    const result = await sap.createProject({
      projectDefinition: projectId,
      description: descMatch![1],
      companyCode: ccMatch![1].toUpperCase(),
      controllingArea: caMatch![1].toUpperCase(),
      plant: plantMatch![1].toUpperCase(),
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      responsiblePerson: from
    });

    if (result.success) {
      await sap.commit();
      await sendWhatsAppMessage(from,
        `✅ *Project Created Successfully*\n\n` +
        `Project ID: *${projectId}*\n` +
        `Status: Created\n\n` +
        `Type \`GET PROJECT ${projectId}\` to view details.`
      );
    } else {
      await sap.rollback();
      await sendWhatsAppMessage(from, `❌ *Error*\n\n${translateSAPError(result.RETURN[0]?.MESSAGE || "Unknown error")}`);
    }
    return;
  }

  // ── RELEASE PROJECT ───────────────────────────────────────────────────────
  if (/^(release|rel)\s+(project\s+)?([A-Z0-9\-_]+)$/i.test(clean)) {
    const match = clean.match(/([A-Z0-9\-_]+)$/i);
    if (!match) { await sendWhatsAppMessage(from, "⚠️ Please provide a Project ID. Example:\nRELEASE P-2024-001"); return; }

    const projectId = match[1].toUpperCase();
    await sendWhatsAppMessage(from, `🔓 Releasing project *${projectId}*...`);

    const result = await sap.releaseProject(projectId);
    if (result.success) {
      await sap.commit();
      await sendWhatsAppMessage(from, `✅ Project *${projectId}* has been *Released* successfully.`);
    } else {
      await sap.rollback();
      await sendWhatsAppMessage(from, `❌ *Error*\n\n${translateSAPError(result.RETURN[0]?.MESSAGE || "Release failed")}`);
    }
    return;
  }

  // ── TECO PROJECT ──────────────────────────────────────────────────────────
  if (/^(teco|tc)\s+(project\s+)?([A-Z0-9\-_]+)$/i.test(clean)) {
    const match = clean.match(/([A-Z0-9\-_]+)$/i);
    if (!match) { await sendWhatsAppMessage(from, "⚠️ Please provide a Project ID. Example:\nTECO P-2024-001"); return; }

    const projectId = match[1].toUpperCase();
    await sendWhatsAppMessage(from, `🏁 Setting Technical Completion for *${projectId}*...`);

    const result = await sap.technicallyComplete(projectId);
    if (result.success) {
      await sap.commit();
      await sendWhatsAppMessage(from, `✅ Project *${projectId}* is now *Technically Complete*.`);
    } else {
      await sap.rollback();
      await sendWhatsAppMessage(from, `❌ *Error*\n\n${translateSAPError(result.RETURN[0]?.MESSAGE || "TECO failed")}`);
    }
    return;
  }

  // ── UNKNOWN COMMAND ───────────────────────────────────────────────────────
  await sendWhatsAppMessage(from,
    `🤔 I didn't understand that command.\n\nType *HELP* to see what I can do.`
  );
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// Health check
server.get("/health", async () => {
  return { status: "OK", sap_mode: config.SAP_MODE };
});

// WhatsApp webhook verification (GET)
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

// WhatsApp incoming messages (POST) ← THIS WAS MISSING
server.post("/webhook", async (request, reply) => {
  reply.status(200).send("OK"); // Always respond 200 to Meta immediately

  try {
    const body = request.body as any;
    const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages;

    if (!messages || messages.length === 0) return;

    for (const message of messages) {
      if (message.type !== "text") {
        await sendWhatsAppMessage(message.from,
          "⚠️ I can only process text commands. Type *HELP* to see available commands."
        );
        continue;
      }
      await processCommand(message.from, message.text.body);
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
  }
});

// ─── START SERVER ─────────────────────────────────────────────────────────────

const start = async () => {
  try {
    await sap.connect();
    await server.listen({ port: 3000, host: "0.0.0.0" });
    console.log("🚀 Server is running at http://localhost:3000");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();