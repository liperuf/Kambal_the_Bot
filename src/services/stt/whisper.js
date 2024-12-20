import { openai } from '../../config/config.js';
import fs from 'fs';

console.log('[Whisper] OpenAI client initialized');

export async function transcribe(audioPath) {
    try {
        console.log('[Whisper] Starting transcription for file:', audioPath);
        console.log('[Whisper] Checking if file exists:', fs.existsSync(audioPath));
        console.log('[Whisper] File size:', fs.statSync(audioPath).size, 'bytes');

        // Create file stream
        console.log('[Whisper] Creating file stream...');
        const fileStream = fs.createReadStream(audioPath);

        // Request transcription
        console.log('[Whisper] Sending transcription request...');
        const response = await openai.audio.transcriptions.create({
            file: fileStream,
            model: "whisper-1",
        });
        
        console.log('[Whisper] Received response:', response);

        if (!response.text) {
            console.error('[Whisper] No text found in response');
            throw new Error('No text found in Whisper response');
        }

        console.log('[Whisper] Transcription successful. Text:', response.text);
        return response.text;
    } catch (error) {
        console.error('[Whisper] Error details:', {
            message: error.message,
            stack: error.stack,
            error
        });
        throw error;
    }
}
