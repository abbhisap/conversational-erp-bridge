console.log('🚀 SAP BRIDGE VERSION 2.0 IS LIVE');
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import Redis from 'ioredis';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- STEP 1: BODY PARSERS (Must be at the top) ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- STEP 2: THE SPY MIDDLEWARE ---
// This will log EVERY request that hits your server
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toISOString()}] Incoming: ${req.method} ${req.url}`);
  next();
});

// 1. Initialize Redis Connection
const redis = new Redis(process.env.REDIS_URL || 'redis://erp_redis:6379');

redis.on('connect', () => console.log('[REDIS] ✅ Connected to Redis'));
redis.on('error', (err: any) => console.error('[REDIS] ❌ Connection error:', err));

// 2. Health Check Route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', bridge: 'Active' });
});

// 3. Meta Webhook Verification (GET)
app.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log(`🔍 Verification Attempt - Mode: ${mode}, Token: ${token}`);

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('✅ Webhook Verified by Meta!');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook Verification Failed.');
    res.sendStatus(403);
  }
});

// 4. WhatsApp Message Receiver (POST)
app.post('/webhook', (req: Request, res: Response) => {
  console.log('📦 POST Request received at /webhook');
  
  const body = req.body;

  // Log the first bit of the body to see if it's empty
  console.log('📄 Body Received:', JSON.stringify(body).substring(0, 100) + '...');

  if (body.object === 'whatsapp_business_account') {
    if (body.entry?.[0].changes?.[0].value.messages) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from;
      const msgBody = message.text?.body || "No text content";

      console.log(`📩 REAL MESSAGE! From: ${from}, Content: ${msgBody}`);

      // Future SAP PS Triggering logic goes here
    } else {
      console.log('⚠️ Received WhatsApp event, but no message content found.');
    }
    res.sendStatus(200);
  } else {
    console.log('❓ Received POST request, but not from WhatsApp Business Account.');
    res.sendStatus(404);
  }
});

// 5. Start Server
app.listen(PORT, () => {
  console.log(`[SAP MOCK] ✅ Connected successfully`);
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});