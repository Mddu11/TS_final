import type { TransactionType } from "./enums.js";

export interface ITransaction {
  readonly id: string;
  readonly type: TransactionType;
  readonly amount: number;
  readonly date: string;
  readonly category: string;
  readonly description: string;
}

export interface ITransactionData extends ITransaction {}

export interface IAccount {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly transactions: readonly ITransaction[];
  getBalance(): number;
}

export interface IAccountData {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly transactions: readonly ITransactionData[];
}

export interface NewTransactionInput {
  readonly type: TransactionType;
  readonly amount: number;
  readonly date: string;
  readonly category: string;
  readonly description?: string;
  readonly id?: string;
}
