import dotenv from "dotenv";
dotenv.config();
import { createClient, RedisClientType } from "redis";

// ─── SESSION STATE MACHINE ────────────────────────────────────────────────────
// These are ALL possible states a user conversation can be in

export type ConversationState =
  | "IDLE"                        // No active conversation
  | "CREATE_AWAITING_PROJECT_ID"  // Asked for project ID, waiting for reply
  | "CREATE_AWAITING_DESCRIPTION" // Asked for description, waiting for reply
  | "CREATE_AWAITING_COMPANY_CODE"// Asked for company code, waiting for reply
  | "CREATE_AWAITING_CONT_AREA"   // Asked for controlling area, waiting
  | "CREATE_AWAITING_PLANT"       // Asked for plant, waiting
  | "CREATE_AWAITING_START_DATE"  // Asked for start date, waiting
  | "CREATE_AWAITING_END_DATE"    // Asked for end date, waiting
  | "CREATE_AWAITING_CONFIRM"     // Showing summary, waiting for confirmation
  | "RELEASE_AWAITING_PROJECT_ID" // Asked for project ID to release
  | "RELEASE_AWAITING_CONFIRM"    // Showing release summary, waiting confirm
  | "TECO_AWAITING_PROJECT_ID"    // Asked for project ID to TECO
  | "TECO_AWAITING_CONFIRM";      // Showing TECO summary, waiting confirm

// ─── SESSION DATA ─────────────────────────────────────────────────────────────
// Everything we know about a user's current conversation

export interface SessionData {
  phone: string;
  state: ConversationState;
  data: {
    projectDefinition?: string;
    description?: string;
    companyCode?: string;
    controllingArea?: string;
    plant?: string;
    startDate?: string;
    endDate?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// ─── SESSION MANAGER CLASS ────────────────────────────────────────────────────

export class SessionManager {
  private client: RedisClientType;
  private readonly TTL_SECONDS = 1800; // Sessions expire after 30 minutes of inactivity
  private connected = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379"
    });

    this.client.on("error", (err) => {
      console.error("[REDIS] Connection error:", err.message);
    });

    this.client.on("connect", () => {
      console.log("[REDIS] ✅ Connected to Redis");
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
    this.connected = false;
  }

  // ── GET session for a user ────────────────────────────────────────────────
  async getSession(phone: string): Promise<SessionData | null> {
    try {
      const key = `session:${phone}`;
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as SessionData;
    } catch (error) {
      console.error("[REDIS] Error getting session:", error);
      return null;
    }
  }

  // ── CREATE or UPDATE session ──────────────────────────────────────────────
  async setSession(phone: string, updates: Partial<SessionData>): Promise<SessionData> {
    const key = `session:${phone}`;
    const existing = await this.getSession(phone);

    const session: SessionData = {
      phone,
      state: updates.state ?? existing?.state ?? "IDLE",
      data: { ...existing?.data, ...updates.data },
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.client.setEx(key, this.TTL_SECONDS, JSON.stringify(session));
    console.log(`[REDIS] Session updated | phone: ${phone} | state: ${session.state}`);
    return session;
  }

  // ── CLEAR session (after success or cancel) ───────────────────────────────
  async clearSession(phone: string): Promise<void> {
    const key = `session:${phone}`;
    await this.client.del(key);
    console.log(`[REDIS] Session cleared for ${phone}`);
  }

  // ── HELPER: get current state ─────────────────────────────────────────────
  async getState(phone: string): Promise<ConversationState> {
    const session = await this.getSession(phone);
    return session?.state ?? "IDLE";
  }

  // ── HELPER: update just the state ─────────────────────────────────────────
  async setState(phone: string, state: ConversationState): Promise<void> {
    await this.setSession(phone, { state });
  }

  // ── HELPER: save one piece of collected data ──────────────────────────────
  async saveData(
    phone: string,
    state: ConversationState,
    dataKey: keyof SessionData["data"],
    value: string
  ): Promise<void> {
    await this.setSession(phone, {
      state,
      data: { [dataKey]: value }
    });
  }
}