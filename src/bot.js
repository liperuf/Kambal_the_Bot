import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import { telegramConfig } from "./config/config.js";
import { downloadAudio, transcribeAudio } from "./services/audioService.js";
import { detectAndNormalizeLaunches } from "./services/financialService.js";
import { formatTableMarkdown } from "./utils/formatter.js";

// Initialize the Telegram bot
const bot = new TelegramBot(telegramConfig.token, telegramConfig.options);

// Main bot handler for voice messages
bot.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.voice.file_id;

    console.log(`[INFO] Message received: Chat ID = ${chatId}, File ID = ${fileId}`);

    try {
        // Download audio from Telegram
        const audioPath = await downloadAudio(bot, fileId);
        console.log(`[INFO] Audio downloaded: Path = ${audioPath}`);

        // Transcribe audio using Whisper
        const transcription = await transcribeAudio(audioPath);
        console.log(`[INFO] Transcription received: ${transcription}`);

        // Detect and normalize financial launches
        const entries = await detectAndNormalizeLaunches(transcription);
        console.log(`[INFO] Entries detected: ${JSON.stringify(entries)}`);

        // Send responses to user
        bot.sendMessage(chatId, `*Transcription:*\n${transcription}`, { parse_mode: "Markdown" });
        bot.sendMessage(chatId, formatTableMarkdown(entries), { parse_mode: "Markdown" });

        // Clean up temporary file
        fs.unlinkSync(audioPath);
        console.log(`[INFO] Temporary file removed: ${audioPath}`);
    } catch (err) {
        console.error(`[ERROR] ${err.message}`);
        bot.sendMessage(chatId, "There was an error processing the audio.");
    }
});

console.log("Bot is active!");