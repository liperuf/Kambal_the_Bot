import fs from "fs";
import https from "https";
import path from "path";
import { openai } from "../config/config.js";

export async function downloadAudio(bot, fileId) {
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

export async function transcribeAudio(filePath) {
    const response = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-1",
    });
    return response.text;
}
