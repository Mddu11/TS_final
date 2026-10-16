import { randomUUID } from "node:crypto";
import { TransactionType } from "../types/enums.js";
import type { ITransactionData, NewTransactionInput } from "../types/interfaces.js";

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
}

export class Transaction implements ITransactionData {
  public readonly id: string;
  public readonly type: TransactionType;
  public readonly amount: number;
  public readonly date: string;
  public readonly category: string;
  public readonly description: string;

  public constructor(input: NewTransactionInput) {
    const category = input.category.trim();

    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error("Сумма транзакции должна быть положительным числом.");
    }

    if (!isValidDateString(input.date)) {
      throw new Error("Дата должна быть корректной и иметь формат ГГГГ-ММ-ДД.");
    }

    if (category.length === 0) {
      throw new Error("Категория не может быть пустой.");
    }

    if (input.type !== TransactionType.INCOME && input.type !== TransactionType.EXPENSE) {
      throw new Error("Неизвестный тип транзакции.");
    }

    this.id = input.id ?? randomUUID();
    this.type = input.type;
    this.amount = input.amount;
    this.date = input.date;
    this.category = category;
    this.description = input.description?.trim() ?? "";
  }

  public static fromData(data: ITransactionData): Transaction {
    return new Transaction({
      id: data.id,
      type: data.type,
      amount: data.amount,
      date: data.date,
      category: data.category,
      description: data.description,
    });
  }

  public toJSON(): ITransactionData {
    return {
      id: this.id,
      type: this.type,
      amount: this.amount,
      date: this.date,
      category: this.category,
      description: this.description,
    };
  }
}
