import { z } from "zod";
import { DateTime } from "luxon";

export const FinancialEntrySchema = z.object({
    date: z.string().refine((date) => DateTime.fromISO(date).isValid, { 
        message: "Invalid date format" 
    }),
    description: z.string(),
    value: z.number(),
    additionalProperties: false,
});

export const FinancialEntriesSchema = z.object({
    entries: z.array(FinancialEntrySchema),
    additionalProperties: false,
});
