import fs from "fs";
import https from "https";
import path from "path";
import { openai } from "../config/config.js";

const KEEP_AUDIO_FILES = process.env.KEEP_AUDIO_FILES === 'true';

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
    
    console.log(`[INFO] Downloading audio to: ${audioPath}`);

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
                    console.log(`[INFO] Audio file saved: ${audioPath}`);
                    resolve(audioPath);
                });
            });
        }).on("error", (error) => {
            console.error(`[ERROR] Failed to download audio:`, error);
            reject(error);
        });
    });
}

export async function transcribeAudio(audioPath) {
    if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
    }

    try {
        console.log(`[INFO] Transcribing audio file: ${audioPath}`);
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioPath),
            model: "whisper-1",
        });
        console.log(`[INFO] Transcription completed for: ${audioPath}`);
        
        // Delete file if not keeping audio files
        if (!KEEP_AUDIO_FILES) {
            fs.unlink(audioPath, (err) => {
                if (err) {
                    console.error(`[ERROR] Failed to delete temporary file: ${audioPath}`, err);
                } else {
                    console.log(`[INFO] Temporary file removed: ${audioPath}`);
                }
            });
        }
        
        return transcription.text;
    } catch (error) {
        // Clean up file on error if not keeping audio files
        if (!KEEP_AUDIO_FILES && fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
        }
        console.error(`[ERROR] Failed to transcribe audio:`, error);
        throw error;
    }
}