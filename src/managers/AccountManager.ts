import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Account } from "../models/Account.js";
import { Transaction } from "../models/Transaction.js";
import { TransactionType } from "../types/enums.js";
import type { IAccountData, ITransactionData } from "../types/interfaces.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTransactionData(value: unknown): value is ITransactionData {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    (value.type === TransactionType.INCOME || value.type === TransactionType.EXPENSE) &&
    typeof value.amount === "number" &&
    Number.isFinite(value.amount) &&
    value.amount > 0 &&
    typeof value.date === "string" &&
    typeof value.category === "string" &&
    typeof value.description === "string"
  );
}

function isAccountData(value: unknown): value is IAccountData {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.createdAt !== "string" ||
    !Array.isArray(value.transactions)
  ) {
    return false;
  }

  const transactions: unknown[] = value.transactions;
  return transactions.every(isTransactionData);
}

export class AccountManager {
  private accounts: Account[] = [];
  private readonly dataFilePath: string;

  public constructor(dataFilePath: string = resolve(process.cwd(), "data", "accounts.json")) {
    this.dataFilePath = dataFilePath;
  }

  public async initialize(): Promise<void> {
    try {
      const fileContent = await readFile(this.dataFilePath, "utf8");
      const parsedData: unknown = JSON.parse(fileContent);

      if (!Array.isArray(parsedData)) {
        throw new Error("Файл с данными должен содержать массив счетов.");
      }

      const records: unknown[] = parsedData;
      if (!records.every(isAccountData)) {
        throw new Error("Файл data/accounts.json содержит данные неверного формата.");
      }

      this.accounts = records.map((record) => Account.fromData(record));
    } catch (error: unknown) {
      if (isRecord(error) && error.code === "ENOENT") {
        await mkdir(dirname(this.dataFilePath), { recursive: true });
        return;
      }
      throw error;
    }
  }

  public getAccounts(): readonly Account[] {
    return [...this.accounts];
  }

  public getAccount(accountId: string): Account | undefined {
    return this.accounts.find((account) => account.id === accountId);
  }

  public async createAccount(name: string): Promise<Account> {
    const normalizedName = name.trim();
    if (normalizedName.length === 0) {
      throw new Error("Название счёта не может быть пустым.");
    }

    let account = new Account(normalizedName);
    while (this.accounts.some((existing) => existing.id === account.id)) {
      account = new Account(normalizedName);
    }

    this.accounts.push(account);
    await this.save();
    return account;
  }

  public async deleteAccount(accountId: string): Promise<boolean> {
    const index = this.accounts.findIndex((account) => account.id === accountId);
    if (index === -1) {
      return false;
    }

    // Транзакции хранятся внутри счёта, поэтому удаляются вместе с ним.
    this.accounts.splice(index, 1);
    await this.save();
    return true;
  }

  public async addTransaction(accountId: string, transaction: Transaction): Promise<boolean> {
    const account = this.getAccount(accountId);
    if (!account) {
      return false;
    }

    account.addTransaction(transaction);
    await this.save();
    return true;
  }

  public async deleteTransaction(accountId: string, transactionId: string): Promise<boolean> {
    const account = this.getAccount(accountId);
    if (!account || !account.removeTransaction(transactionId)) {
      return false;
    }

    await this.save();
    return true;
  }

  private async save(): Promise<void> {
    await mkdir(dirname(this.dataFilePath), { recursive: true });
    const content = JSON.stringify(this.accounts.map((account) => account.toJSON()), null, 2);
    await writeFile(this.dataFilePath, `${content}\n`, "utf8");
  }
}
