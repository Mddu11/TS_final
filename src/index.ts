import { ApplicationController } from "./controllers/ApplicationController.js";
import { AccountManager } from "./managers/AccountManager.js";

async function main(): Promise<void> {
  const accountManager = new AccountManager();
  await accountManager.initialize();

  const application = new ApplicationController(accountManager);
  await application.run();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "неизвестная ошибка";
  console.error(`Не удалось запустить приложение: ${message}`);
  process.exitCode = 1;
});
