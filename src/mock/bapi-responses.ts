// src/mock/bapi-responses.ts
// These simulate EXACT responses from a real SAP PS system

import {
  CreateProjectResponse,
  GetProjectInfoResponse,
  BAPIReturn
} from '../types/sap.types';

// ─── REUSABLE SUCCESS/ERROR RETURNS ──────────────────────────

export const SUCCESS_RETURN: BAPIReturn = {
  TYPE: 'S',
  ID: 'CJ',
  NUMBER: '000',
  MESSAGE: 'Operation completed successfully',
  LOG_NO: '',
  LOG_MSG_NO: '000000',
  MESSAGE_V1: '',
  MESSAGE_V2: ''
};

export const ERROR_DUPLICATE_PROJECT: BAPIReturn = {
  TYPE: 'E',
  ID: 'CJ',
  NUMBER: '001',
  MESSAGE: 'Project P-2024-001 already exists in the system',
  LOG_NO: '',
  LOG_MSG_NO: '000001',
  MESSAGE_V1: 'P-2024-001',
  MESSAGE_V2: ''
};

export const ERROR_INVALID_COMPANY_CODE: BAPIReturn = {
  TYPE: 'E',
  ID: 'CJ',
  NUMBER: '020',
  MESSAGE: 'Company Code 9999 does not exist',
  LOG_NO: '',
  LOG_MSG_NO: '000002',
  MESSAGE_V1: '9999',
  MESSAGE_V2: ''
};

// ─── MOCK PROJECT DATABASE (simulates SAP data store) ────────
// This acts as your "fake SAP system" - projects stored in memory

export const MOCK_PROJECT_DATABASE: Record<string, GetProjectInfoResponse> = {
  'P-2024-001': {
    PROJECT_DEFINITION: 'P-2024-001',
    PROJECT_DEFINITION_DATA: {
      PSPID: 'P-2024-001',
      POST1: 'Highway Construction Phase 1',
      PLFAZ: '2024-01-01',
      PLSEZ: '2025-12-31',
      VBUKR: '1000',
      KOKRS: 'A000',
      WERKS: '1001',
      VERNR: 'JOHN.DOE',
      ASTNA: 'Created'
    },
    RETURN: [SUCCESS_RETURN],
    success: true
  },
  'P-2024-002': {
    PROJECT_DEFINITION: 'P-2024-002',
    PROJECT_DEFINITION_DATA: {
      PSPID: 'P-2024-002',
      POST1: 'Bridge Rehabilitation Project',
      PLFAZ: '2024-03-01',
      PLSEZ: '2024-11-30',
      VBUKR: '1000',
      KOKRS: 'A000',
      WERKS: '1002',
      VERNR: 'JANE.SMITH',
      ASTNA: 'Released'
    },
    RETURN: [SUCCESS_RETURN],
    success: true
  }
};