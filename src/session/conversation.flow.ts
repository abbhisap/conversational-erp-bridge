import { SessionManager, SessionData } from "./session.manager";
import { SAPMockAdapter } from "../adapters/sap-mock.adapter";

// ─── MASTER DATA ──────────────────────────────────────────────────────────────
// Simulates SAP master data — users pick from these lists

export const COMPANY_CODES = [
  { code: "1000", name: "Company India" },
  { code: "2000", name: "Company UAE" },
  { code: "3000", name: "Company UK" }
];

export const CONTROLLING_AREAS = [
  { code: "A000", name: "Controlling Area India" },
  { code: "B000", name: "Controlling Area International" }
];

export const PLANTS = [
  { code: "1001", name: "Plant Mumbai" },
  { code: "1002", name: "Plant Delhi" },
  { code: "2001", name: "Plant Dubai" }
];

// ─── CONVERSATION FLOW CLASS ──────────────────────────────────────────────────

export class ConversationFlow {
  constructor(
    private sessions: SessionManager,
    private sap: SAPMockAdapter,
    private sendMessage: (to: string, message: string) => Promise<void>
  ) {}

  // ─── ENTRY POINT: called for EVERY incoming message ────────────────────────

  async handle(phone: string, text: string): Promise<void> {
    const clean = text.trim();
    const state = await this.sessions.getState(phone);

    console.log(`[FLOW] phone: ${phone} | state: ${state} | text: "${clean}"`);

    // ── If user types CANCEL at any point, reset everything ─────────────────
    if (/^(cancel|stop|reset|quit)$/i.test(clean)) {
      await this.sessions.clearSession(phone);
      await this.sendMessage(phone,
        "❌ *Cancelled.*\n\nYour current operation has been cancelled.\nType *HELP* to start again."
      );
      return;
    }

    // ── Route based on current state ─────────────────────────────────────────
    switch (state) {

      case "IDLE":
        await this.handleIdleState(phone, clean);
        break;

      // CREATE PROJECT flow states
      case "CREATE_AWAITING_PROJECT_ID":
        await this.handleCreateProjectId(phone, clean);
        break;
      case "CREATE_AWAITING_DESCRIPTION":
        await this.handleCreateDescription(phone, clean);
        break;
      case "CREATE_AWAITING_COMPANY_CODE":
        await this.handleCreateCompanyCode(phone, clean);
        break;
      case "CREATE_AWAITING_CONT_AREA":
        await this.handleCreateControllingArea(phone, clean);
        break;
      case "CREATE_AWAITING_PLANT":
        await this.handleCreatePlant(phone, clean);
        break;
      case "CREATE_AWAITING_START_DATE":
        await this.handleCreateStartDate(phone, clean);
        break;
      case "CREATE_AWAITING_END_DATE":
        await this.handleCreateEndDate(phone, clean);
        break;
      case "CREATE_AWAITING_CONFIRM":
        await this.handleCreateConfirm(phone, clean);
        break;

      // RELEASE flow states
      case "RELEASE_AWAITING_PROJECT_ID":
        await this.handleReleaseProjectId(phone, clean);
        break;
      case "RELEASE_AWAITING_CONFIRM":
        await this.handleReleaseConfirm(phone, clean);
        break;

      // TECO flow states
      case "TECO_AWAITING_PROJECT_ID":
        await this.handleTecoProjectId(phone, clean);
        break;
      case "TECO_AWAITING_CONFIRM":
        await this.handleTecoConfirm(phone, clean);
        break;

      default:
        await this.sessions.clearSession(phone);
        await this.handleIdleState(phone, clean);
    }
  }

  // ─── IDLE STATE: detect what the user wants to do ─────────────────────────

  private async handleIdleState(phone: string, text: string): Promise<void> {

    if (/^(help|hi|hello|start)$/i.test(text)) {
      await this.sendMessage(phone,
        `👋 Welcome to *SAP Project System Bot*!\n\n` +
        `What would you like to do?\n\n` +
        `1️⃣  *CREATE PROJECT* — Create a new SAP project\n` +
        `2️⃣  *GET PROJECT* — View project details\n` +
        `3️⃣  *RELEASE* — Release a project\n` +
        `4️⃣  *TECO* — Technically complete a project\n\n` +
        `Type any command or its number to begin.\n` +
        `Type *CANCEL* anytime to stop.`
      );
      return;
    }

    // Accept number shortcuts from menu
    if (text === "1" || /^create/i.test(text)) {
      await this.startCreateFlow(phone);
      return;
    }

    if (text === "2" || /^(get|info|status)/i.test(text)) {
      await this.startGetFlow(phone, text);
      return;
    }

    if (text === "3" || /^(release|rel)/i.test(text)) {
      await this.startReleaseFlow(phone);
      return;
    }

    if (text === "4" || /^(teco|tc)/i.test(text)) {
      await this.startTecoFlow(phone);
      return;
    }

    // Unknown command
    await this.sendMessage(phone,
      `🤔 I didn't understand that.\n\nType *HELP* to see available commands.`
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE PROJECT FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  private async startCreateFlow(phone: string): Promise<void> {
    await this.sessions.setState(phone, "CREATE_AWAITING_PROJECT_ID");
    await this.sendMessage(phone,
      `📁 *Create New SAP Project*\n\n` +
      `Step 1 of 7\n\n` +
      `Please enter the *Project ID*:\n` +
      `_(e.g. P-2024-010)_\n\n` +
      `Type *CANCEL* to stop.`
    );
  }

  private async handleCreateProjectId(phone: string, text: string): Promise<void> {
    // Validate format: letters, numbers, hyphens only
    if (!/^[A-Z0-9\-_]{3,20}$/i.test(text)) {
      await this.sendMessage(phone,
        `⚠️ Invalid Project ID format.\n\n` +
        `Project ID must be 3-20 characters, letters and numbers only.\n` +
        `_(e.g. P-2024-010)_\n\nPlease try again:`
      );
      return;
    }

    await this.sessions.saveData(phone, "CREATE_AWAITING_DESCRIPTION", "projectDefinition", text.toUpperCase());
    await this.sendMessage(phone,
      `✅ Project ID: *${text.toUpperCase()}*\n\n` +
      `Step 2 of 7\n\n` +
      `Please enter the *Project Description*:\n` +
      `_(e.g. Highway Bridge Renovation Phase 1)_`
    );
  }

  private async handleCreateDescription(phone: string, text: string): Promise<void> {
    if (text.length < 5) {
      await this.sendMessage(phone, `⚠️ Description too short. Please enter at least 5 characters:`);
      return;
    }

    await this.sessions.saveData(phone, "CREATE_AWAITING_COMPANY_CODE", "description", text);

    const list = COMPANY_CODES.map((c, i) => `${i + 1}️⃣  *${c.code}* — ${c.name}`).join("\n");
    await this.sendMessage(phone,
      `✅ Description saved.\n\n` +
      `Step 3 of 7\n\n` +
      `Select *Company Code*:\n\n${list}\n\n` +
      `Reply with the number or code (e.g. *1* or *1000*)`
    );
  }

  private async handleCreateCompanyCode(phone: string, text: string): Promise<void> {
    const selected = this.selectFromList(text, COMPANY_CODES);

    if (!selected) {
      const list = COMPANY_CODES.map((c, i) => `${i + 1}️⃣  *${c.code}* — ${c.name}`).join("\n");
      await this.sendMessage(phone, `⚠️ Invalid selection. Please choose:\n\n${list}`);
      return;
    }

    await this.sessions.saveData(phone, "CREATE_AWAITING_CONT_AREA", "companyCode", selected.code);

    const list = CONTROLLING_AREAS.map((c, i) => `${i + 1}️⃣  *${c.code}* — ${c.name}`).join("\n");
    await this.sendMessage(phone,
      `✅ Company Code: *${selected.code} — ${selected.name}*\n\n` +
      `Step 4 of 7\n\n` +
      `Select *Controlling Area*:\n\n${list}\n\n` +
      `Reply with the number or code`
    );
  }

  private async handleCreateControllingArea(phone: string, text: string): Promise<void> {
    const selected = this.selectFromList(text, CONTROLLING_AREAS);

    if (!selected) {
      const list = CONTROLLING_AREAS.map((c, i) => `${i + 1}️⃣  *${c.code}* — ${c.name}`).join("\n");
      await this.sendMessage(phone, `⚠️ Invalid selection. Please choose:\n\n${list}`);
      return;
    }

    await this.sessions.saveData(phone, "CREATE_AWAITING_PLANT", "controllingArea", selected.code);

    const list = PLANTS.map((c, i) => `${i + 1}️⃣  *${c.code}* — ${c.name}`).join("\n");
    await this.sendMessage(phone,
      `✅ Controlling Area: *${selected.code} — ${selected.name}*\n\n` +
      `Step 5 of 7\n\n` +
      `Select *Plant*:\n\n${list}\n\n` +
      `Reply with the number or code`
    );
  }

  private async handleCreatePlant(phone: string, text: string): Promise<void> {
    const selected = this.selectFromList(text, PLANTS);

    if (!selected) {
      const list = PLANTS.map((c, i) => `${i + 1}️⃣  *${c.code}* — ${c.name}`).join("\n");
      await this.sendMessage(phone, `⚠️ Invalid selection. Please choose:\n\n${list}`);
      return;
    }

    await this.sessions.saveData(phone, "CREATE_AWAITING_START_DATE", "plant", selected.code);
    await this.sendMessage(phone,
      `✅ Plant: *${selected.code} — ${selected.name}*\n\n` +
      `Step 6 of 7\n\n` +
      `Enter *Project Start Date*:\n` +
      `_(Format: YYYY-MM-DD, e.g. 2024-06-01)_\n\n` +
      `Or type *SKIP* to use today's date.`
    );
  }

  private async handleCreateStartDate(phone: string, text: string): Promise<void> {
    let date = text;

    if (/^skip$/i.test(text)) {
      date = new Date().toISOString().split("T")[0];
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      await this.sendMessage(phone,
        `⚠️ Invalid date format.\n\nPlease use YYYY-MM-DD format.\n_(e.g. 2024-06-01)_\n\nOr type *SKIP* for today.`
      );
      return;
    }

    await this.sessions.saveData(phone, "CREATE_AWAITING_END_DATE", "startDate", date);
    await this.sendMessage(phone,
      `✅ Start Date: *${date}*\n\n` +
      `Step 7 of 7\n\n` +
      `Enter *Project End Date*:\n` +
      `_(Format: YYYY-MM-DD, e.g. 2025-12-31)_\n\n` +
      `Or type *SKIP* to leave blank.`
    );
  }

  private async handleCreateEndDate(phone: string, text: string): Promise<void> {
    let date = text;

    if (/^skip$/i.test(text)) {
      date = "";
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      await this.sendMessage(phone,
        `⚠️ Invalid date format.\n\nPlease use YYYY-MM-DD format.\n_(e.g. 2025-12-31)_\n\nOr type *SKIP* to leave blank.`
      );
      return;
    }

    await this.sessions.saveData(phone, "CREATE_AWAITING_CONFIRM", "endDate", date);

    // Show full summary before confirming
    const session = await this.sessions.getSession(phone);
    const d = session!.data;

    await this.sendMessage(phone,
      `📋 *Please Confirm Project Details*\n\n` +
      `*Project ID:* ${d.projectDefinition}\n` +
      `*Description:* ${d.description}\n` +
      `*Company Code:* ${d.companyCode}\n` +
      `*Controlling Area:* ${d.controllingArea}\n` +
      `*Plant:* ${d.plant}\n` +
      `*Start Date:* ${d.startDate}\n` +
      `*End Date:* ${d.endDate || "Not specified"}\n\n` +
      `Reply *YES* to create this project in SAP\n` +
      `Reply *NO* to cancel`
    );
  }

  private async handleCreateConfirm(phone: string, text: string): Promise<void> {
    if (/^(no|cancel|n)$/i.test(text)) {
      await this.sessions.clearSession(phone);
      await this.sendMessage(phone, "❌ Project creation cancelled. Type *HELP* to start again.");
      return;
    }

    if (!/^(yes|y|confirm|ok)$/i.test(text)) {
      await this.sendMessage(phone, `Please reply *YES* to confirm or *NO* to cancel.`);
      return;
    }

    const session = await this.sessions.getSession(phone);
    const d = session!.data;

    await this.sendMessage(phone, `⏳ Creating project *${d.projectDefinition}* in SAP...`);

    try {
      const result = await this.sap.createProject({
        projectDefinition: d.projectDefinition!,
        description: d.description!,
        companyCode: d.companyCode!,
        controllingArea: d.controllingArea!,
        plant: d.plant!,
        startDate: d.startDate!,
        endDate: d.endDate || "",
        responsiblePerson: phone
      });

      if (result.success) {
        await this.sap.commit();
        await this.sessions.clearSession(phone);
        await this.sendMessage(phone,
          `✅ *Project Created Successfully!*\n\n` +
          `*Project ID:* ${d.projectDefinition}\n` +
          `*Status:* Created in SAP PS\n\n` +
          `Type *GET PROJECT ${d.projectDefinition}* to view details.\n` +
          `Type *HELP* for more options.`
        );
      } else {
        await this.sap.rollback();
        await this.sessions.clearSession(phone);
        await this.sendMessage(phone, `❌ *SAP Error*\n\n${result.RETURN[0]?.MESSAGE}`);
      }
    } catch (error) {
      await this.sap.rollback();
      await this.sessions.clearSession(phone);
      await this.sendMessage(phone, `❌ Unexpected error. Please try again.`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GET PROJECT FLOW (single step — no session needed)
  // ═══════════════════════════════════════════════════════════════════════════

  private async startGetFlow(phone: string, text: string): Promise<void> {
    // Check if project ID already in the command
    const match = text.match(/(?:get|info|status)\s+(?:project\s+)?([A-Z0-9\-_]+)/i);

    if (match) {
      await this.fetchAndSendProject(phone, match[1].toUpperCase());
    } else {
      await this.sessions.setState(phone, "IDLE");
      await this.sendMessage(phone,
        `🔍 *Get Project Info*\n\nPlease enter the Project ID:\n_(e.g. P-2024-001)_`
      );
    }
  }

  private async fetchAndSendProject(phone: string, projectId: string): Promise<void> {
    await this.sendMessage(phone, `🔍 Fetching project *${projectId}*...`);
    const result = await this.sap.getProjectInfo(projectId);

    if (result.success) {
      const d = result.PROJECT_DEFINITION_DATA;
      await this.sendMessage(phone,
        `📋 *Project Details*\n\n` +
        `*ID:* ${d.PSPID}\n` +
        `*Description:* ${d.POST1}\n` +
        `*Status:* ${d.ASTNA}\n` +
        `*Company Code:* ${d.VBUKR}\n` +
        `*Controlling Area:* ${d.KOKRS}\n` +
        `*Plant:* ${d.WERKS}\n` +
        `*Start Date:* ${d.PLFAZ}\n` +
        `*End Date:* ${d.PLSEZ}\n` +
        `*Responsible:* ${d.VERNR}`
      );
    } else {
      await this.sendMessage(phone,
        `❌ Project *${projectId}* not found in SAP.\n\nPlease check the ID and try again.`
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RELEASE PROJECT FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  private async startReleaseFlow(phone: string): Promise<void> {
    await this.sessions.setState(phone, "RELEASE_AWAITING_PROJECT_ID");
    await this.sendMessage(phone,
      `🔓 *Release Project*\n\n` +
      `Please enter the *Project ID* to release:\n_(e.g. P-2024-001)_\n\n` +
      `Type *CANCEL* to stop.`
    );
  }

  private async handleReleaseProjectId(phone: string, text: string): Promise<void> {
    if (!/^[A-Z0-9\-_]{3,20}$/i.test(text)) {
      await this.sendMessage(phone, `⚠️ Invalid Project ID. Please try again:`);
      return;
    }

    const projectId = text.toUpperCase();

    // First verify project exists
    const check = await this.sap.getProjectInfo(projectId);
    if (!check.success) {
      await this.sendMessage(phone, `❌ Project *${projectId}* not found in SAP. Please check the ID.`);
      return;
    }

    await this.sessions.saveData(phone, "RELEASE_AWAITING_CONFIRM", "projectDefinition", projectId);
    await this.sendMessage(phone,
      `⚠️ *Confirm Release*\n\n` +
      `You are about to *RELEASE* project:\n` +
      `*${projectId}* — ${check.PROJECT_DEFINITION_DATA.POST1}\n\n` +
      `This will change the status to *REL* in SAP.\n\n` +
      `Reply *YES* to confirm or *NO* to cancel.`
    );
  }

  private async handleReleaseConfirm(phone: string, text: string): Promise<void> {
    if (/^(no|cancel|n)$/i.test(text)) {
      await this.sessions.clearSession(phone);
      await this.sendMessage(phone, "❌ Release cancelled.");
      return;
    }
    if (!/^(yes|y|confirm|ok)$/i.test(text)) {
      await this.sendMessage(phone, `Please reply *YES* to confirm or *NO* to cancel.`);
      return;
    }

    const session = await this.sessions.getSession(phone);
    const projectId = session!.data.projectDefinition!;

    await this.sendMessage(phone, `⏳ Releasing project *${projectId}*...`);

    const result = await this.sap.releaseProject(projectId);
    if (result.success) {
      await this.sap.commit();
      await this.sessions.clearSession(phone);
      await this.sendMessage(phone,
        `✅ *Project Released Successfully!*\n\n` +
        `*Project ID:* ${projectId}\n` +
        `*New Status:* Released (REL)\n\n` +
        `Type *HELP* for more options.`
      );
    } else {
      await this.sap.rollback();
      await this.sessions.clearSession(phone);
      await this.sendMessage(phone, `❌ *Release Failed*\n\n${result.RETURN[0]?.MESSAGE}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TECO PROJECT FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  private async startTecoFlow(phone: string): Promise<void> {
    await this.sessions.setState(phone, "TECO_AWAITING_PROJECT_ID");
    await this.sendMessage(phone,
      `🏁 *Technical Completion*\n\n` +
      `Please enter the *Project ID* to technically complete:\n_(e.g. P-2024-001)_\n\n` +
      `Type *CANCEL* to stop.`
    );
  }

  private async handleTecoProjectId(phone: string, text: string): Promise<void> {
    if (!/^[A-Z0-9\-_]{3,20}$/i.test(text)) {
      await this.sendMessage(phone, `⚠️ Invalid Project ID. Please try again:`);
      return;
    }

    const projectId = text.toUpperCase();
    const check = await this.sap.getProjectInfo(projectId);

    if (!check.success) {
      await this.sendMessage(phone, `❌ Project *${projectId}* not found in SAP.`);
      return;
    }

    await this.sessions.saveData(phone, "TECO_AWAITING_CONFIRM", "projectDefinition", projectId);
    await this.sendMessage(phone,
      `⚠️ *Confirm Technical Completion*\n\n` +
      `You are about to set *TECO* for project:\n` +
      `*${projectId}* — ${check.PROJECT_DEFINITION_DATA.POST1}\n\n` +
      `This will change the status to *TECO* in SAP.\n\n` +
      `Reply *YES* to confirm or *NO* to cancel.`
    );
  }

  private async handleTecoConfirm(phone: string, text: string): Promise<void> {
    if (/^(no|cancel|n)$/i.test(text)) {
      await this.sessions.clearSession(phone);
      await this.sendMessage(phone, "❌ TECO cancelled.");
      return;
    }
    if (!/^(yes|y|confirm|ok)$/i.test(text)) {
      await this.sendMessage(phone, `Please reply *YES* to confirm or *NO* to cancel.`);
      return;
    }

    const session = await this.sessions.getSession(phone);
    const projectId = session!.data.projectDefinition!;

    await this.sendMessage(phone, `⏳ Setting Technical Completion for *${projectId}*...`);

    const result = await this.sap.technicallyComplete(projectId);
    if (result.success) {
      await this.sap.commit();
      await this.sessions.clearSession(phone);
      await this.sendMessage(phone,
        `✅ *Technical Completion Set!*\n\n` +
        `*Project ID:* ${projectId}\n` +
        `*New Status:* Technically Complete (TECO)\n\n` +
        `Type *HELP* for more options.`
      );
    } else {
      await this.sap.rollback();
      await this.sessions.clearSession(phone);
      await this.sendMessage(phone, `❌ *TECO Failed*\n\n${result.RETURN[0]?.MESSAGE}`);
    }
  }

  // ─── UTILITY: Select from numbered list ───────────────────────────────────

  private selectFromList(
    input: string,
    list: Array<{ code: string; name: string }>
  ): { code: string; name: string } | null {
    // User typed a number like "1", "2", "3"
    const num = parseInt(input);
    if (!isNaN(num) && num >= 1 && num <= list.length) {
      return list[num - 1];
    }
    // User typed the code directly like "1000", "A000"
    const byCode = list.find(
      item => item.code.toLowerCase() === input.toLowerCase()
    );
    return byCode || null;
  }
}