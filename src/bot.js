import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import https from "https";
import { DateTime } from "luxon";
import OpenAI from "openai";

dotenv.config(); // Carrega variáveis de ambiente

// Configuração da API OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORGANIZATION, // Opcional
});

// Inicializa o bot do Telegram
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// Configurações de custos
const WHISPER_COST_PER_MINUTE = 0.006;
const LLM_COST_PER_1000_TOKENS = 0.002;

bot.on("voice", async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.voice.file_id;
    const duration = msg.voice.duration;

    console.log(`[INFO] Mensagem recebida: Chat ID = ${chatId}, File ID = ${fileId}, Duração = ${duration} segundos`);

    try {
        // Baixar o áudio do Telegram
        const audioPath = await downloadAudio(fileId);
        console.log(`[INFO] Áudio baixado: Caminho = ${audioPath}`);

        // Transcrever o áudio usando o Whisper
        const transcription = await transcribeAudio(audioPath);
        console.log(`[INFO] Transcrição recebida: ${transcription}`);

        // Detectar lançamentos financeiros e normalizar datas
        const launches = await detectAndNormalizeLaunches(transcription);
        console.log(`[INFO] Lançamentos detectados: ${JSON.stringify(launches)}`);

        // Calcular custos
        // const whisperCost = calculateWhisperCost(duration);
        // const llmCost = calculateLLMCost(transcription);
        // const totalCost = whisperCost + llmCost;

        // console.log(`[INFO] Custos calculados: Whisper = $${whisperCost}, LLM = $${llmCost}, Total = $${totalCost}`);

        // Enviar respostas ao usuário
        bot.sendMessage(chatId, `*Transcrição:*\n${transcription}`, { parse_mode: "Markdown" });
        bot.sendMessage(chatId, formatTableMarkdown(launches), { parse_mode: "Markdown" });
        // bot.sendMessage(
        //     chatId,
        //     `*Custos:*\n` +
        //         `- *Whisper:* ${convertToCents(whisperCost)} centavos\n` +
        //         `- *LLM:* ${convertToCents(llmCost)} centavos\n` +
        //         `- *Total:* ${convertToCents(totalCost)} centavos`,
        //     { parse_mode: "Markdown" }
        // );

        // Limpar arquivo temporário
        fs.unlinkSync(audioPath);
        console.log(`[INFO] Arquivo temporário removido: ${audioPath}`);
    } catch (err) {
        console.error(`[ERROR] ${err.message}`);
        console.error(`[DEBUG] Detalhes do erro:`, err.response?.data || err.stack);
        bot.sendMessage(chatId, "Houve um erro ao processar o áudio.");
    }
});

// Função para baixar o áudio do Telegram
async function downloadAudio(fileId) {
    const fileUrl = await bot.getFileLink(fileId);
    const audioPath = path.join("./", "temp.ogg");

    console.log(`[INFO] URL do arquivo obtida: ${fileUrl}`);

    // Baixa o arquivo usando https.get
    await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(audioPath);
        https.get(fileUrl, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Falha no download. Status: ${response.statusCode}`));
            }
            response.pipe(file);
            file.on("finish", () => {
                file.close(resolve);
            });
        }).on("error", (err) => {
            fs.unlink(audioPath, () => reject(err));
        });
    });

    return audioPath;
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
    const today = DateTime.now().setZone("America/Sao_Paulo").toFormat("dd/MM/yyyy");
    const messages = [
        {
            role: "system",
            content: `Você é um assistente financeiro. A data de hoje é ${today}. Baseado nesse contexto, processe o texto fornecido para identificar lançamentos financeiros no formato JSON puro, sem qualquer formatação adicional, como blocos de código Markdown (ex.: \`\`\`json). Cada lançamento deve conter:
            - "data": data do lançamento no formato DD/MM/AAAA.
            - "descricao": descrição do gasto.
            - "valor": valor do lançamento.
            Se nenhum lançamento for encontrado, retorne um JSON vazio [].`,
        },
        { role: "user", content: transcription },
    ];

    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages,
    });

    let responseText = response.choices[0].message.content.trim();

    // Remova marcas de código Markdown, se existirem
    if (responseText.startsWith("```json")) {
        responseText = responseText.replace(/```json|```/g, "").trim();
    }

    // Tente parsear o JSON
    try {
        return JSON.parse(responseText);
    } catch (err) {
        console.error(`[ERROR] Falha ao processar JSON:`, responseText);
        throw new Error("A resposta da API não está em formato JSON válido.");
    }
}

// Função para formatar a tabela em Markdown
function formatTableMarkdown(launches) {
    // Verifica se launches é um array diretamente
    if (Array.isArray(launches)) {
        return formatLaunchesArray(launches);
    }

    // Verifica se launches contém a chave "lançamentos" e é um objeto
    if (launches && Array.isArray(launches.lançamentos)) {
        return formatLaunchesArray(launches.lançamentos);
    }

    // Caso contrário, retorno padrão
    return "*Nenhum lançamento detectado.*";
}

// Função auxiliar para formatar o array de lançamentos
function formatLaunchesArray(launchesArray) {
    let formattedTable = "*Lançamentos:*\n\n";
    launchesArray.forEach((launch) => {
        formattedTable += `  *Data:* ${launch.data}\n`;
        formattedTable += `  *Descrição:* ${launch.descricao}\n`;
        formattedTable += `  *Valor:* R$${launch.valor.toFixed(2)}\n\n`;
    });
    return formattedTable.trim();
}

// Funções auxiliares para cálculo de custos
function calculateWhisperCost(durationInSeconds) {
    return (durationInSeconds / 60) * WHISPER_COST_PER_MINUTE;
}

function calculateLLMCost(transcription) {
    const tokenCount = transcription.split(/\s+/).length;
    return (tokenCount / 1000) * LLM_COST_PER_1000_TOKENS;
}

function convertToCents(valueInDollars) {
    return Math.round(valueInDollars * 100);
}

console.log("Bot está ativo!");