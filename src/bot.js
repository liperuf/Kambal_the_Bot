import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import https from "https";
import { DateTime } from "luxon";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import OpenAI from "openai";

dotenv.config(); // Carrega variáveis de ambiente

// Configuração da API OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION, // Opcional
});

// Inicializa o bot do Telegram
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// Esquema para entradas financeiras
const FinancialEntrySchema = z.object({
    date: z.string().refine((date) => DateTime.fromISO(date).isValid, { message: "Invalid date format" }),
    description: z.string(),
    value: z.number(),
    additionalProperties: false, // Propriedade para evitar dados extras
});

// Esquema principal
const FinancialEntriesSchema = z.object({
    entries: z.array(FinancialEntrySchema),
    additionalProperties: false,
});

// Função principal do bot
bot.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.voice.file_id;

    console.log(`[INFO] Mensagem recebida: Chat ID = ${chatId}, File ID = ${fileId}`);

    try {
        // Baixar o áudio do Telegram
        const audioPath = await downloadAudio(fileId);
        console.log(`[INFO] Áudio baixado: Caminho = ${audioPath}`);

        // Transcrever o áudio usando Whisper
        const transcription = await transcribeAudio(audioPath);
        console.log(`[INFO] Transcrição recebida: ${transcription}`);

        // Detectar e normalizar lançamentos financeiros
        const entries = await detectAndNormalizeLaunches(transcription);
        console.log(`[INFO] Lançamentos detectados: ${JSON.stringify(entries)}`);

        // Enviar respostas ao usuário
        bot.sendMessage(chatId, `*Transcrição:*\n${transcription}`, { parse_mode: "Markdown" });
        bot.sendMessage(chatId, formatTableMarkdown(entries), { parse_mode: "Markdown" });

        // Limpar arquivo temporário
        fs.unlinkSync(audioPath);
        console.log(`[INFO] Arquivo temporário removido: ${audioPath}`);
    } catch (err) {
        console.error(`[ERROR] ${err.message}`);
        bot.sendMessage(chatId, "Houve um erro ao processar o áudio.");
    }
});

// Função para baixar o áudio do Telegram
async function downloadAudio(fileId) {
    const fileUrl = await bot.getFileLink(fileId);
    const audioPath = path.join("./", "temp.ogg");

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(audioPath);
        https.get(fileUrl, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Download failed with status: ${response.statusCode}`));
            }
            response.pipe(file);
            file.on("finish", () => {
                file.close(() => resolve(audioPath));
            });
        }).on("error", reject);
    });
}

// Função para transcrever o áudio usando Whisper
async function transcribeAudio(filePath) {
    const response = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-1",
    });
    return response.text;
}

// Função para detectar e normalizar lançamentos financeiros
async function detectAndNormalizeLaunches(transcription) {
    const today = DateTime.now().setZone("America/Sao_Paulo").toISODate();
    const messages = [
        {
            role: "system",
            content: `You are a financial assistant. Today's date is ${today}. Extract financial entries from the given transcription.`,
        },
        { role: "user", content: transcription },
    ];

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini-2024-07-18",
            messages,
            response_format: zodResponseFormat(FinancialEntriesSchema, "financial_entries"),
        });

        if (completion.choices[0].message.refusal) {
            throw new Error("The model refused to generate the structured output.");
        }

        // Obter a mensagem e fazer o parsing do JSON
        const parsedResponse = JSON.parse(completion.choices[0].message.content); // Converte a string JSON em objeto

        // Validar se a resposta contém a propriedade 'entries'
        if (!parsedResponse.entries || !Array.isArray(parsedResponse.entries)) {
            throw new Error("Invalid 'entries' format in API response.");
        }

        return parsedResponse.entries;
    } catch (err) {
        console.error(`[ERROR] Failed to process structured JSON:`, err.message);
        throw new Error("Failed to process structured JSON.");
    }
}

// Função para formatar os lançamentos em Markdown
function formatTableMarkdown(entries) {
    if (!entries.length) return "*No entries detected.*";

    let table = "*Financial Entries:*\n";
    entries.forEach((entry) => {
        table += `- *Date:* ${entry.date}\n`;
        table += `  *Description:* ${entry.description}\n`;
        table += `  *Value:* $${entry.value.toFixed(2)}\n\n`;
    });
    return table.trim();
}

console.log("Bot está ativo!");