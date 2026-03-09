// src/config/index.ts

export const config = {
  // Change this to 'real' when you get SAP access
  SAP_MODE: process.env.SAP_MODE || 'mock',

  SAP: {
    HOST: process.env.SAP_HOST || 'localhost',
    SYSTEM_NUMBER: process.env.SAP_SYSNR || '00',
    CLIENT: process.env.SAP_CLIENT || '100',
    USER: process.env.SAP_USER || '',
    PASSWORD: process.env.SAP_PASSWORD || '',
  }
};