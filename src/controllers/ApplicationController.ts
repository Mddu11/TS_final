import inquirer from "inquirer";
import { Account } from "../models/Account.js";
import { Transaction } from "../models/Transaction.js";
import { AccountManager } from "../managers/AccountManager.js";
import { AccountMenuAction, MainMenuAction, TransactionType } from "../types/enums.js";
import { exportAccountToCsv } from "../utils/csvExporter.js";
import { isValidDateString } from "../models/Transaction.js";

export class ApplicationController {
  public constructor(private readonly accountManager: AccountManager) {}

  public async run(): Promise<void> {
    let isRunning = true;

    while (isRunning) {
      console.clear();
      this.printAccounts();

      const answers = await inquirer.prompt<{ action: MainMenuAction }>([
        {
          type: "list",
          name: "action",
          message: "Главное меню — выберите действие:",
          choices: [
            { name: "Просмотреть список счетов", value: MainMenuAction.LIST_ACCOUNTS },
            { name: "Создать новый счёт", value: MainMenuAction.CREATE_ACCOUNT },
            { name: "Выбрать счёт для управления", value: MainMenuAction.SELECT_ACCOUNT },
            { name: "Выход", value: MainMenuAction.EXIT },
          ],
          pageSize: 8,
        },
      ]);

      switch (answers.action) {
        case MainMenuAction.LIST_ACCOUNTS:
          console.clear();
          this.printAccounts();
          await this.pause();
          break;
        case MainMenuAction.CREATE_ACCOUNT:
          await this.createAccount();
          break;
        case MainMenuAction.SELECT_ACCOUNT:
          await this.selectAccount();
          break;
        case MainMenuAction.EXIT:
          isRunning = false;
          break;
      }
    }

    console.clear();
    console.log("Работа приложения завершена. Данные сохранены. До свидания!");
  }

  private printAccounts(): void {
    const accounts = this.accountManager.getAccounts();
    console.log("========================================");
    console.log("       УПРАВЛЕНИЕ ЛИЧНЫМИ ФИНАНСАМИ");
    console.log("========================================\n");

    if (accounts.length === 0) {
      console.log("Счетов пока нет. Создайте первый счёт через главное меню.\n");
      return;
    }

    console.log("Ваши счета:");
    for (const [index, account] of accounts.entries()) {
      console.log(
        `${index + 1}. ${account.name} | Баланс: ${this.formatAmount(account.getBalance())} | Транзакций: ${account.transactions.length}`,
      );
    }
    console.log("");
  }

  private async createAccount(): Promise<void> {
    console.clear();
    const answers = await inquirer.prompt<{ name: string }>([
      {
        type: "input",
        name: "name",
        message: "Введите название нового счёта:",
        validate: (value: string): boolean | string =>
          value.trim().length > 0 || "Название не должно быть пустым.",
      },
    ]);

    try {
      const account = await this.accountManager.createAccount(answers.name);
      console.log(`\nСчёт «${account.name}» успешно создан.`);
      console.log(`Уникальный ID: ${account.id}`);
    } catch (error: unknown) {
      console.log(`Не удалось создать счёт: ${this.getErrorMessage(error)}`);
    }
    await this.pause();
  }

  private async selectAccount(): Promise<void> {
    const accounts = this.accountManager.getAccounts();
    if (accounts.length === 0) {
      console.clear();
      console.log("Сначала создайте счёт.");
      await this.pause();
      return;
    }

    const answers = await inquirer.prompt<{ accountId: string }>([
      {
        type: "list",
        name: "accountId",
        message: "Выберите счёт:",
        choices: [
          ...accounts.map((account) => ({
            name: `${account.name} — баланс ${this.formatAmount(account.getBalance())}`,
            value: account.id,
          })),
          { name: "Назад", value: "__back__" },
        ],
        pageSize: 10,
      },
    ]);

    if (answers.accountId === "__back__") {
      return;
    }

    const account = this.accountManager.getAccount(answers.accountId);
    if (account) {
      await this.openAccount(account);
    }
  }

  private async openAccount(account: Account): Promise<void> {
    let isOpen = true;

    while (isOpen) {
      const currentAccount = this.accountManager.getAccount(account.id);
      if (!currentAccount) {
        return;
      }

      console.clear();
      this.printAccountDetails(currentAccount);

      const answers = await inquirer.prompt<{ action: AccountMenuAction }>([
        {
          type: "list",
          name: "action",
          message: "Действия со счётом:",
          choices: [
            { name: "Добавить транзакцию", value: AccountMenuAction.ADD_TRANSACTION },
            { name: "Удалить транзакцию", value: AccountMenuAction.DELETE_TRANSACTION },
            { name: "Экспортировать счёт в CSV", value: AccountMenuAction.EXPORT_CSV },
            { name: "Удалить счёт", value: AccountMenuAction.DELETE_ACCOUNT },
            { name: "Вернуться в главное меню", value: AccountMenuAction.BACK },
          ],
          pageSize: 8,
        },
      ]);

      switch (answers.action) {
        case AccountMenuAction.ADD_TRANSACTION:
          await this.addTransaction(currentAccount);
          break;
        case AccountMenuAction.DELETE_TRANSACTION:
          await this.deleteTransaction(currentAccount);
          break;
        case AccountMenuAction.EXPORT_CSV:
          await this.exportCsv(currentAccount);
          break;
        case AccountMenuAction.DELETE_ACCOUNT:
          if (await this.confirm(`Удалить счёт «${currentAccount.name}» и все его транзакции?`)) {
            const deleted = await this.accountManager.deleteAccount(currentAccount.id);
            console.log(deleted ? "Счёт и все связанные транзакции удалены." : "Счёт не найден.");
            await this.pause();
            isOpen = false;
          }
          break;
        case AccountMenuAction.BACK:
          isOpen = false;
          break;
      }
    }
  }

  private printAccountDetails(account: Account): void {
    console.log("========================================");
    console.log(`СЧЁТ: ${account.name}`);
    console.log(`ID: ${account.id}`);
    console.log(`Создан: ${account.createdAt.slice(0, 10)}`);
    console.log(`Баланс: ${this.formatAmount(account.getBalance())}`);
    console.log("========================================\n");

    const transactions = account.transactions;
    if (transactions.length === 0) {
      console.log("В этом счёте пока нет транзакций.\n");
      return;
    }

    console.log("Транзакции:");
    for (const [index, transaction] of transactions.entries()) {
      const sign = transaction.type === TransactionType.INCOME ? "+" : "−";
      const description = transaction.description ? ` | ${transaction.description}` : "";
      console.log(
        `${index + 1}. [${transaction.date}] ${transaction.type}: ${sign}${this.formatAmount(transaction.amount)} | ${transaction.category}${description}`,
      );
      console.log(`   ID: ${transaction.id}`);
    }
    console.log("");
  }

  private async addTransaction(account: Account): Promise<void> {
    console.clear();
    console.log(`Добавление транзакции для счёта «${account.name}»\n`);

    const answers = await inquirer.prompt<{
      type: TransactionType;
      amount: string;
      date: string;
      category: string;
      description: string;
    }>([
      {
        type: "list",
        name: "type",
        message: "Тип транзакции:",
        choices: [
          { name: "Доход", value: TransactionType.INCOME },
          { name: "Расход", value: TransactionType.EXPENSE },
        ],
      },
      {
        type: "input",
        name: "amount",
        message: "Сумма (больше нуля; десятичный разделитель — точка):",
        validate: (value: string): boolean | string => {
          const amount = Number(value);
          return value.trim().length > 0 && Number.isFinite(amount) && amount > 0
            ? true
            : "Введите положительное число, например 1250 или 1250.50.";
        },
      },
      {
        type: "input",
        name: "date",
        message: "Дата (ГГГГ-ММ-ДД):",
        default: new Date().toISOString().slice(0, 10),
        validate: (value: string): boolean | string =>
          isValidDateString(value.trim()) || "Введите существующую дату в формате ГГГГ-ММ-ДД.",
      },
      {
        type: "input",
        name: "category",
        message: "Категория (например, продукты, транспорт, зарплата):",
        validate: (value: string): boolean | string =>
          value.trim().length > 0 || "Категория не должна быть пустой.",
      },
      {
        type: "input",
        name: "description",
        message: "Комментарий (необязательно):",
      },
    ]);

    try {
      const transaction = new Transaction({
        type: answers.type,
        amount: Number(answers.amount),
        date: answers.date.trim(),
        category: answers.category.trim(),
        description: answers.description,
      });
      const added = await this.accountManager.addTransaction(account.id, transaction);
      console.log(added ? "\nТранзакция успешно добавлена." : "\nСчёт не найден; транзакция не добавлена.");
    } catch (error: unknown) {
      console.log(`\nНе удалось добавить транзакцию: ${this.getErrorMessage(error)}`);
    }

    await this.pause();
  }

  private async deleteTransaction(account: Account): Promise<void> {
    const transactions = account.transactions;
    if (transactions.length === 0) {
      console.log("В этом счёте нет транзакций для удаления.");
      await this.pause();
      return;
    }

    const answers = await inquirer.prompt<{ transactionId: string }>([
      {
        type: "list",
        name: "transactionId",
        message: "Выберите транзакцию для удаления:",
        choices: [
          ...transactions.map((transaction) => ({
            name: `${transaction.date} | ${transaction.type} | ${this.formatAmount(transaction.amount)} | ${transaction.category}`,
            value: transaction.id,
          })),
          { name: "Отмена", value: "__cancel__" },
        ],
        pageSize: 10,
      },
    ]);

    if (answers.transactionId === "__cancel__") {
      return;
    }

    const selected = transactions.find((transaction) => transaction.id === answers.transactionId);
    if (!selected) {
      console.log("Транзакция не найдена.");
      await this.pause();
      return;
    }

    const confirmed = await this.confirm(
      `Удалить транзакцию «${selected.type}: ${this.formatAmount(selected.amount)} — ${selected.category}»?`,
    );
    if (!confirmed) {
      console.log("Удаление отменено.");
      await this.pause();
      return;
    }

    const deleted = await this.accountManager.deleteTransaction(account.id, selected.id);
    console.log(deleted ? "Транзакция удалена." : "Не удалось найти эту транзакцию.");
    await this.pause();
  }

  private async exportCsv(account: Account): Promise<void> {
    try {
      const filePath = await exportAccountToCsv(account);
      console.log(`CSV-файл создан: ${filePath}`);
      console.log("Файл содержит заголовки и все транзакции выбранного счёта.");
    } catch (error: unknown) {
      console.log(`Не удалось экспортировать CSV: ${this.getErrorMessage(error)}`);
    }
    await this.pause();
  }

  private async confirm(message: string): Promise<boolean> {
    const answers = await inquirer.prompt<{ confirmed: boolean }>([
      {
        type: "confirm",
        name: "confirmed",
        message,
        default: false,
      },
    ]);
    return answers.confirmed;
  }

  private async pause(): Promise<void> {
    await inquirer.prompt<{ continue: string }>([
      {
        type: "input",
        name: "continue",
        message: "Нажмите Enter, чтобы продолжить",
      },
    ]);
  }

  private formatAmount(amount: number): string {
    return new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "неизвестная ошибка";
  }
}
