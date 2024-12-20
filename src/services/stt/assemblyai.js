import { sttConfig } from '../../config/config.js';
import { AssemblyAI } from 'assemblyai';

console.log('[AssemblyAI] Initializing client');
const client = new AssemblyAI({
    apiKey: sttConfig.apiKeys.assemblyai
});

export async function transcribe(audioPath) {
    try {
        console.log('[AssemblyAI] Starting transcription for file:', audioPath);

        // Create transcript with local file
        console.log('[AssemblyAI] Submitting transcription request...');
        const transcript = await client.transcripts.transcribe({
            audio: audioPath,
            language_code: 'pt'
        });

        console.log('[AssemblyAI] Transcription completed. Response:', transcript);

        if (transcript.status === 'error') {
            console.error('[AssemblyAI] Transcription failed:', transcript.error);
            throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
        }

        return transcript.text;
    } catch (error) {
        console.error('[AssemblyAI] Error:', {
            message: error.message,
            stack: error.stack,
            error
        });
        throw error;
    }
}
