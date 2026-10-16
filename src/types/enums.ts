export enum TransactionType {
  INCOME = "Доход",
  EXPENSE = "Расход",
}

export enum MainMenuAction {
  LIST_ACCOUNTS = "list-accounts",
  CREATE_ACCOUNT = "create-account",
  SELECT_ACCOUNT = "select-account",
  EXIT = "exit",
}

export enum AccountMenuAction {
  ADD_TRANSACTION = "add-transaction",
  DELETE_TRANSACTION = "delete-transaction",
  EXPORT_CSV = "export-csv",
  DELETE_ACCOUNT = "delete-account",
  BACK = "back",
}
