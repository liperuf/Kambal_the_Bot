import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

export const openaiConfig = {
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION,
};

export const telegramConfig = {
    token: process.env.TELEGRAM_TOKEN,
    options: { polling: true }
};

export const openai = new OpenAI(openaiConfig);
