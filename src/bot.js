import TelegramBot from "node-telegram-bot-api";
import { telegramConfig } from "./config/config.js";
import { downloadAudio, transcribeAudio } from "./services/audioService.js";
import { detectAndNormalizeLaunches } from "./services/financialService.js";
import { formatTableMarkdown } from "./utils/formatter.js";

const bot = new TelegramBot(telegramConfig.token, telegramConfig.options);

bot.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.voice.file_id;

    console.log(`[INFO] Message received: Chat ID = ${chatId}, File ID = ${fileId}`);

    try {
        const audioPath = await downloadAudio(bot, fileId);
        const transcription = await transcribeAudio(audioPath);
        const entries = await detectAndNormalizeLaunches(transcription);

        bot.sendMessage(chatId, `*Transcription:*\n${transcription}`, { parse_mode: "Markdown" });
        bot.sendMessage(chatId, formatTableMarkdown(entries), { parse_mode: "Markdown" });
    } catch (err) {
        console.error(`[ERROR] ${err.message}`);
        bot.sendMessage(chatId, "There was an error processing the audio.");
    }
});

console.log("Bot is active!");