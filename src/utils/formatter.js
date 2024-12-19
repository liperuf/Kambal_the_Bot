export function formatTableMarkdown(entries) {
    if (!entries.length) return "*No entries detected.*";

    let table = "*Financial Entries:*\n";
    entries.forEach((entry) => {
        table += `- *Date:* ${entry.date}\n`;
        table += `  *Description:* ${entry.description}\n`;
        table += `  *Value:* $${entry.value.toFixed(2)}\n\n`;
    });
    return table.trim();
}
