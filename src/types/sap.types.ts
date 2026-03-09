// src/types/sap.types.ts
// These types mirror the EXACT structure SAP BAPIs return
// Source: SAP help.sap.com BAPI documentation

// ─── SHARED TYPES ───────────────────────────────────────────

// Every BAPI returns a RETURN table with these fields
export interface BAPIReturn {
  TYPE: 'S' | 'E' | 'W' | 'I';  // S=Success, E=Error, W=Warning, I=Info
  ID: string;                     // Message class (e.g., "CJ")
  NUMBER: string;                 // Message number (e.g., "001")
  MESSAGE: string;                // Human-readable message
  LOG_NO: string;
  LOG_MSG_NO: string;
  MESSAGE_V1: string;
  MESSAGE_V2: string;
}

// ─── PROJECT DEFINITION TYPES ───────────────────────────────

export interface ProjectDefinitionData {
  PSPID: string;        // Project ID (e.g., "P-2024-001")
  POST1: string;        // Project description
  PLFAZ: string;        // Planned start date (YYYY-MM-DD)
  PLSEZ: string;        // Planned end date (YYYY-MM-DD)
  VBUKR: string;        // Company Code (e.g., "1000")
  KOKRS: string;        // Controlling Area (e.g., "A000")
  WERKS: string;        // Plant (e.g., "1001")
  VERNR: string;        // Responsible person (SAP User ID)
  ASTNA: string;        // Project status
}

// ─── WBS ELEMENT TYPES ──────────────────────────────────────

export interface WBSElement {
  PSPID: string;        // Parent Project ID
  POSID: string;        // WBS Element ID (e.g., "P-2024-001.1")
  POST1: string;        // WBS Description
  PLFAZ: string;        // Start date
  PLSEZ: string;        // End date
  FAKKZ: boolean;       // Billing element flag
  BELKZ: boolean;       // Account assignment element flag
}

// ─── BAPI REQUEST TYPES (what YOU send to SAP) ──────────────

export interface CreateProjectRequest {
  projectDefinition: string;       // e.g., "P-2024-001"
  description: string;
  companyCode: string;
  controllingArea: string;
  plant: string;
  startDate: string;               // Format: YYYY-MM-DD
  endDate: string;
  responsiblePerson: string;       // SAP User ID
  wbsElements?: WBSElement[];
}

// ─── BAPI RESPONSE TYPES (what SAP sends back to YOU) ────────

export interface CreateProjectResponse {
  PROJECT_DEFINITION: string;
  RETURN: BAPIReturn[];
  success: boolean;               // We add this ourselves for convenience
}

export interface GetProjectInfoResponse {
  PROJECT_DEFINITION: string;
  PROJECT_DEFINITION_DATA: ProjectDefinitionData;
  WBS_ELEMENTS?: WBSElement[];
  RETURN: BAPIReturn[];
  success: boolean;
}