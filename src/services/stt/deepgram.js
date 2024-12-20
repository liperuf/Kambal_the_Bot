import { sttConfig } from '../../config/config.js';
import fs from 'fs';
import pkg from '@deepgram/sdk';
const { Deepgram } = pkg;

console.log('[Deepgram] Initializing client with API key:', sttConfig.apiKeys.deepgram);
const deepgram = new Deepgram(sttConfig.apiKeys.deepgram);

export async function transcribe(audioPath) {
    try {
        console.log('[Deepgram] Starting transcription for file:', audioPath);
        console.log('[Deepgram] Checking if file exists:', fs.existsSync(audioPath));
        console.log('[Deepgram] File size:', fs.statSync(audioPath).size, 'bytes');

        // Read the audio file
        console.log('[Deepgram] Reading audio file...');
        const audioBuffer = fs.readFileSync(audioPath);
        const mimetype = 'audio/ogg';
        console.log('[Deepgram] File read successfully. Mime type:', mimetype);
        
        console.log('[Deepgram] Preparing transcription request with parameters:', {
            model: 'nova-2',
            smart_format: true,
            language: 'pt-BR'
        });

        // Request transcription
        console.log('[Deepgram] Sending transcription request...');
        const response = await deepgram.transcription.preRecorded({
            buffer: audioBuffer,
            mimetype: mimetype
        }, {
            model: 'nova-2',
            smart_format: true,
            language: 'pt-BR'
        });
        
        console.log('[Deepgram] Received response:', response);
        
        if (!response.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
            console.error('[Deepgram] No transcript found in response');
            throw new Error('No transcript found in Deepgram response');
        }

        const transcript = response.results.channels[0].alternatives[0].transcript;
        console.log('[Deepgram] Transcription successful. Text:', transcript);
        
        return transcript;
    } catch (error) {
        console.error('[Deepgram] Error details:', {
            message: error.message,
            stack: error.stack,
            error
        });
        throw error;
    }
}
