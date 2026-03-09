// src/adapters/sap.interface.ts
// This is the CONTRACT that both Mock and Real adapters must follow
// The rest of your app only ever talks to this interface - never directly
// to mock or real SAP

import {
  CreateProjectRequest,
  CreateProjectResponse,
  GetProjectInfoResponse
} from '../types/sap.types';

export interface ISAPAdapter {
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // Project operations
  createProject(params: CreateProjectRequest): Promise<CreateProjectResponse>;
  getProjectInfo(projectId: string): Promise<GetProjectInfoResponse>;
  releaseProject(projectId: string): Promise<CreateProjectResponse>;
  technicallyComplete(projectId: string): Promise<CreateProjectResponse>;
  
  // Transaction control - CRITICAL for atomic operations
  commit(): Promise<void>;
  rollback(): Promise<void>;
  
  // Health check
  ping(): Promise<boolean>;
}