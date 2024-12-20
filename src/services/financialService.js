import { DateTime } from "luxon";
import { openai } from "../config/config.js";
import { FinancialEntriesSchema } from "../schemas/financial.js";
import { zodResponseFormat } from "openai/helpers/zod";

export async function detectAndNormalizeLaunches(transcription) {
    console.log('[FINANCIAL] Starting analysis of transcription:', transcription);

    const today = DateTime.now().setZone("America/Sao_Paulo").toISODate();
    console.log('[FINANCIAL] Using reference date:', today);

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

        const parsedResponse = JSON.parse(completion.choices[0].message.content);

        if (!parsedResponse.entries || !Array.isArray(parsedResponse.entries)) {
            throw new Error("Invalid 'entries' format in API response.");
        }

        return parsedResponse.entries;
    } catch (err) {
        console.error('[FINANCIAL] Error processing structured JSON:', {
            message: err.message,
            stack: err.stack
        });
        throw new Error("Failed to process structured JSON.");
    }
}
