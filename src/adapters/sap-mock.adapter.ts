// src/adapters/sap-mock.adapter.ts

import { ISAPAdapter } from './sap.interface';
import {
  CreateProjectRequest,
  CreateProjectResponse,
  GetProjectInfoResponse
} from '../types/sap.types';
import {
  SUCCESS_RETURN,
  ERROR_DUPLICATE_PROJECT,
  ERROR_INVALID_COMPANY_CODE,
  MOCK_PROJECT_DATABASE
} from '../mock/bapi-responses';

// Valid master data - simulates SAP configuration tables
const VALID_COMPANY_CODES = ['1000', '2000', '3000'];
const VALID_CONTROLLING_AREAS = ['A000', 'B000'];
const VALID_PLANTS = ['1001', '1002', '2001'];

export class SAPMockAdapter implements ISAPAdapter {

  // Simulates the in-memory SAP database during a session
  private mockDatabase = { ...MOCK_PROJECT_DATABASE };
  private isConnected = false;

  async connect(): Promise<void> {
    console.log('[SAP MOCK] Connecting to mock SAP system...');
    await this.simulateDelay(300); // Real SAP takes ~300ms to connect
    this.isConnected = true;
    console.log('[SAP MOCK] ✅ Connected successfully');
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log('[SAP MOCK] Disconnected from mock SAP system');
  }

  async ping(): Promise<boolean> {
    return this.isConnected;
  }

  async createProject(params: CreateProjectRequest): Promise<CreateProjectResponse> {
    console.log('[SAP MOCK] Calling BAPI_BUS2001_CREATE with:', params);
    await this.simulateDelay(500);

    // ── VALIDATION (mirrors real SAP validation logic) ──────────

    // Check 1: Duplicate project ID
    if (this.mockDatabase[params.projectDefinition]) {
      return {
        PROJECT_DEFINITION: '',
        RETURN: [ERROR_DUPLICATE_PROJECT],
        success: false
      };
    }

    // Check 2: Invalid Company Code
    if (!VALID_COMPANY_CODES.includes(params.companyCode)) {
      return {
        PROJECT_DEFINITION: '',
        RETURN: [ERROR_INVALID_COMPANY_CODE],
        success: false
      };
    }

    // ── SUCCESS: Create the project in mock database ─────────────
    this.mockDatabase[params.projectDefinition] = {
      PROJECT_DEFINITION: params.projectDefinition,
      PROJECT_DEFINITION_DATA: {
        PSPID: params.projectDefinition,
        POST1: params.description,
        PLFAZ: params.startDate,
        PLSEZ: params.endDate,
        VBUKR: params.companyCode,
        KOKRS: params.controllingArea,
        WERKS: params.plant,
        VERNR: params.responsiblePerson,
        ASTNA: 'Created'
      },
      RETURN: [SUCCESS_RETURN],
      success: true
    };

    return {
      PROJECT_DEFINITION: params.projectDefinition,
      RETURN: [SUCCESS_RETURN],
      success: true
    };
  }

  async getProjectInfo(projectId: string): Promise<GetProjectInfoResponse> {
    console.log(`[SAP MOCK] Calling BAPI_PROJECT_GETINFO for: ${projectId}`);
    await this.simulateDelay(200);

    const project = this.mockDatabase[projectId];

    if (!project) {
      return {
        PROJECT_DEFINITION: projectId,
        PROJECT_DEFINITION_DATA: {} as any,
        RETURN: [{
          TYPE: 'E',
          ID: 'CJ',
          NUMBER: '010',
          MESSAGE: `Project ${projectId} does not exist`,
          LOG_NO: '',
          LOG_MSG_NO: '000003',
          MESSAGE_V1: projectId,
          MESSAGE_V2: ''
        }],
        success: false
      };
    }

    return project;
  }

  async releaseProject(projectId: string): Promise<CreateProjectResponse> {
    console.log(`[SAP MOCK] Releasing project: ${projectId}`);
    await this.simulateDelay(400);

    if (!this.mockDatabase[projectId]) {
      return { PROJECT_DEFINITION: projectId, RETURN: [{ TYPE: 'E', ID: 'CJ', NUMBER: '010', MESSAGE: `Project ${projectId} not found`, LOG_NO: '', LOG_MSG_NO: '', MESSAGE_V1: '', MESSAGE_V2: '' }], success: false };
    }

    this.mockDatabase[projectId].PROJECT_DEFINITION_DATA.ASTNA = 'Released';
    return { PROJECT_DEFINITION: projectId, RETURN: [SUCCESS_RETURN], success: true };
  }

  async technicallyComplete(projectId: string): Promise<CreateProjectResponse> {
    console.log(`[SAP MOCK] Setting TECO for project: ${projectId}`);
    await this.simulateDelay(400);

    if (!this.mockDatabase[projectId]) {
      return { PROJECT_DEFINITION: projectId, RETURN: [{ TYPE: 'E', ID: 'CJ', NUMBER: '010', MESSAGE: `Project ${projectId} not found`, LOG_NO: '', LOG_MSG_NO: '', MESSAGE_V1: '', MESSAGE_V2: '' }], success: false };
    }

    this.mockDatabase[projectId].PROJECT_DEFINITION_DATA.ASTNA = 'Technically Complete';
    return { PROJECT_DEFINITION: projectId, RETURN: [SUCCESS_RETURN], success: true };
  }

  // In real SAP, commit makes changes permanent. Mock doesn't need to do anything.
  async commit(): Promise<void> {
    console.log('[SAP MOCK] BAPI_TRANSACTION_COMMIT called - changes persisted');
  }

  // In real SAP, rollback undoes everything since last commit
  async rollback(): Promise<void> {
    console.log('[SAP MOCK] BAPI_TRANSACTION_ROLLBACK called - changes discarded');
    // In a real rollback scenario you would restore previous state
  }

  // Helper: simulate network latency to behave like real SAP
  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}