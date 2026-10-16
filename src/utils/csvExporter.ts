import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Account } from "../models/Account.js";

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function safeFileName(value: string): string {
  const cleaned = value.normalize("NFKC").replace(/[^\p{L}\p{N}_-]+/gu, "_").replace(/^_+|_+$/g, "");
  return cleaned.length > 0 ? cleaned : "account";
}

export async function exportAccountToCsv(account: Account): Promise<string> {
  const exportDirectory = resolve(process.cwd(), "exports");
  await mkdir(exportDirectory, { recursive: true });

  const fileName = `${safeFileName(account.name)}_${account.id}.csv`;
  const filePath = resolve(exportDirectory, fileName);
  const rows: string[][] = [
    ["transaction_id", "type", "amount", "date", "category", "description"],
    ...account.transactions.map((transaction) => [
      transaction.id,
      transaction.type,
      transaction.amount.toFixed(2),
      transaction.date,
      transaction.category,
      transaction.description,
    ]),
  ];

  const csvContent = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
  // BOM помогает корректно открывать кириллицу в некоторых версиях Excel.
  await writeFile(filePath, `\uFEFF${csvContent}\r\n`, "utf8");
  return filePath;
}
