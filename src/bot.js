import TelegramBot from "node-telegram-bot-api";
import { telegramConfig } from "./config/config.js";
import { downloadAudio, transcribeAudio } from "./services/audioService.js";
import { detectAndNormalizeLaunches } from "./services/financialService.js";
import { formatTableMarkdown } from "./utils/formatter.js";

const bot = new TelegramBot(telegramConfig.token, telegramConfig.options);

bot.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.voice.file_id;

    console.log(`[BOT] Received voice message:`, {
        chatId,
        fileId,
        duration: msg.voice.duration,
        fileSize: msg.voice.file_size
    });

    try {
        const audioPath = await downloadAudio(bot, fileId);
        console.log('[BOT] Audio downloaded successfully:', audioPath);

        const transcription = await transcribeAudio(audioPath);
        console.log('[BOT] Transcription completed:', transcription);

        const entries = await detectAndNormalizeLaunches(transcription);
        console.log('[BOT] Analysis completed:', entries);

        bot.sendMessage(chatId, `*Transcription:*\n${transcription}`, { parse_mode: "Markdown" });
        bot.sendMessage(chatId, formatTableMarkdown(entries), { parse_mode: "Markdown" });
    } catch (err) {
        console.error('[BOT] Error processing message:', {
            message: err.message,
            stack: err.stack
        });
        bot.sendMessage(chatId, "There was an error processing the audio.");
    }
});

console.log("Bot is active! Using STT provider:", process.env.STT_PROVIDER);