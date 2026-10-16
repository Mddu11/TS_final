import { randomUUID } from "node:crypto";
import type { IAccount, IAccountData, ITransaction, ITransactionData } from "../types/interfaces.js";
import { TransactionType } from "../types/enums.js";
import { Transaction } from "./Transaction.js";

export class Account implements IAccount {
  public readonly id: string;
  public readonly name: string;
  public readonly createdAt: string;
  private readonly transactionItems: Transaction[];

  public constructor(
    name: string,
    id: string = randomUUID(),
    createdAt: string = new Date().toISOString(),
    transactions: readonly Transaction[] = [],
  ) {
    const normalizedName = name.trim();
    if (normalizedName.length === 0) {
      throw new Error("Название счёта не может быть пустым.");
    }

    this.id = id;
    this.name = normalizedName;
    this.createdAt = createdAt;
    this.transactionItems = [...transactions];
  }

  public get transactions(): readonly ITransaction[] {
    return [...this.transactionItems];
  }

  public getBalance(): number {
    return this.transactionItems.reduce((balance, transaction) => {
      if (transaction.type === TransactionType.INCOME) {
        return balance + transaction.amount;
      }
      return balance - transaction.amount;
    }, 0);
  }

  public addTransaction(transaction: Transaction): void {
    const alreadyExists = this.transactionItems.some((item) => item.id === transaction.id);
    if (alreadyExists) {
      throw new Error("Транзакция с таким ID уже существует в этом счёте.");
    }
    this.transactionItems.push(transaction);
  }

  public removeTransaction(transactionId: string): boolean {
    const index = this.transactionItems.findIndex((item) => item.id === transactionId);
    if (index === -1) {
      return false;
    }

    this.transactionItems.splice(index, 1);
    return true;
  }

  public toJSON(): IAccountData {
    const transactions: ITransactionData[] = this.transactionItems.map((transaction) => transaction.toJSON());
    return {
      id: this.id,
      name: this.name,
      createdAt: this.createdAt,
      transactions,
    };
  }

  public static fromData(data: IAccountData): Account {
    const transactions = data.transactions.map((item) => Transaction.fromData(item));
    return new Account(data.name, data.id, data.createdAt, transactions);
  }
}
