import fs from "fs";
import https from "https";
import path from "path";
import * as whisper from "./stt/whisper.js";
import * as assemblyai from "./stt/assemblyai.js";
import * as deepgram from "./stt/deepgram.js";
import { sttConfig } from "../config/config.js";

const KEEP_AUDIO_FILES = process.env.KEEP_AUDIO_FILES === 'true';

const sttProviders = {
    whisper,
    assemblyai,
    deepgram
};

export async function downloadAudio(bot, fileId) {
    const fileUrl = await bot.getFileLink(fileId);
    const timestamp = Date.now();
    const fileName = `audio_${timestamp}.ogg`;
    
    // If we're keeping files, store in tmp directory, otherwise use temp.ogg in root
    const audioPath = KEEP_AUDIO_FILES 
        ? path.join(process.cwd(), 'tmp', fileName)
        : path.join(process.cwd(), 'temp.ogg');

    // Create tmp directory if keeping files
    if (KEEP_AUDIO_FILES && !fs.existsSync(path.join(process.cwd(), 'tmp'))) {
        fs.mkdirSync(path.join(process.cwd(), 'tmp'), { recursive: true });
    }
    
    console.log(`[AUDIO] Downloading audio to: ${audioPath}`);

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(audioPath);
        https.get(fileUrl, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Download failed with status: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on("finish", () => {
                file.close(() => {
                    console.log(`[AUDIO] Audio file saved: ${audioPath}`);
                    resolve(audioPath);
                });
            });
        }).on("error", (error) => {
            console.error(`[AUDIO] Failed to download audio:`, error);
            reject(error);
        });
    });
}

export async function transcribeAudio(audioPath) {
    if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
    }

    try {
        console.log(`[AUDIO] Using STT provider: ${sttConfig.provider}`);
        
        const provider = sttProviders[sttConfig.provider];
        if (!provider) {
            throw new Error(`Invalid STT provider: ${sttConfig.provider}`);
        }

        const transcription = await provider.transcribe(audioPath);
        console.log(`[AUDIO] Transcription completed using ${sttConfig.provider}`);
        
        // Delete file if not keeping audio files
        if (!KEEP_AUDIO_FILES) {
            fs.unlink(audioPath, (err) => {
                if (err) {
                    console.error(`[AUDIO] Failed to delete temporary file: ${audioPath}`, err);
                } else {
                    console.log(`[AUDIO] Temporary file removed: ${audioPath}`);
                }
            });
        }
        
        return transcription;
    } catch (error) {
        // Clean up file on error if not keeping audio files
        if (!KEEP_AUDIO_FILES && fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
        }
        console.error(`[AUDIO] Failed to transcribe audio:`, error);
        throw error;
    }
}