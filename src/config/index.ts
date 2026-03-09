import dotenv from "dotenv";
dotenv.config();

export const config = {
  // Use the value from .env, or default to "mock"
  SAP_MODE: process.env.SAP_MODE || "mock",
  
  // WhatsApp Credentials from .env
  WHATSAPP: {
    TOKEN: process.env.WHATSAPP_TOKEN,
    PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    VERIFY_TOKEN: process.env.WEBHOOK_VERIFY_TOKEN,
  },

  SAP: {
    HOST: process.env.SAP_HOST || "localhost",
    SYSTEM_NUMBER: process.env.SAP_SYSNR || "00",
    CLIENT: process.env.SAP_CLIENT || "100",
    USER: process.env.SAP_USER || "",
    PASSWORD: process.env.SAP_PASSWORD || "",
  }
};
