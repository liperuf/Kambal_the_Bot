require('dotenv').config(); // Carregar variáveis de ambiente do arquivo .env
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data'); // Certifique-se de ter instalado com `npm install form-data`
const { TELEGRAM_TOKEN, WHISPER_API_URL, OPENAI_API_KEY } = require('../config/config');

// Inicializar o bot do Telegram
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

bot.on('voice', async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.voice.file_id;

    try {
        // Baixar o arquivo de áudio do Telegram
        const fileUrl = await bot.getFileLink(fileId);
        const audioPath = path.join(__dirname, 'temp.ogg');
        const writer = fs.createWriteStream(audioPath);
        const response = await axios.get(fileUrl, { responseType: 'stream' });
        response.data.pipe(writer);

        // Garantir que o arquivo foi totalmente gravado antes de continuar
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // Enviar para a API do Whisper para transcrição
        const transcription = await transcribeAudio(audioPath);
        bot.sendMessage(chatId, `Transcrição: ${transcription}`);
        
        // Remover o arquivo temporário
        fs.unlinkSync(audioPath);
    } catch (err) {
        console.error('Erro ao processar áudio:', err.message || err);
        bot.sendMessage(chatId, 'Houve um erro ao processar o áudio.');
    }
});

async function transcribeAudio(filePath) {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('model', 'whisper-1');

    try {
        const response = await axios.post(WHISPER_API_URL, formData, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                ...formData.getHeaders(), // Headers gerados automaticamente pelo FormData
            },
        });

        return response.data.text; // Retorna o texto transcrito
    } catch (err) {
        console.error('Erro na transcrição:', err.response?.data || err.message);
        throw new Error('Erro ao transcrever o áudio');
    }
}

console.log('Bot está ativo!');
