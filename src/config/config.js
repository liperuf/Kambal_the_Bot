import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

export const openaiConfig = {
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION,
};

export const telegramConfig = {
    token: process.env.TELEGRAM_TOKEN,
    options: { polling: true }
};

export const sttConfig = {
    provider: process.env.STT_PROVIDER || 'whisper',
    apiKeys: {
        assemblyai: process.env.ASSEMBLYAI_API_KEY,
        deepgram: process.env.DEEPGRAM_API_KEY,
    }
};

export const openai = new OpenAI(openaiConfig);
