import {Telegraf} from 'telegraf';
import dotenv from 'dotenv';
import {findOrCreateUser} from './user';
import {parseMessage} from './llm';
import {addExpense, getMonthlyTotal, getCategoryTotal} from './expense';

dotenv.config();

const botOptions =
  process.env.NODE_ENV === 'development' &&
  process.env.TELEGRAM_LOCAL_API === 'true'
    ? {
      telegram: {
        apiRoot: 'http://localhost:8081',
      },
    }
    : {};

export const telegramBot = new Telegraf(
  process.env.TELEGRAM_BOT_TOKEN!,
  botOptions,
);

export interface TelegramMessage {
  id: number;
  author: {
    id: number;
    username?: string;
    first_name?: string;
  };
  content: string;
  chatId: number;
}

export async function sendTelegramMessage(
  chatId: number,
  content: string,
): Promise<void> {
  await telegramBot.telegram.sendMessage(chatId, content);
}

export async function initializeTelegramBot(): Promise<void> {
  console.log('Initializing Telegram bot...');

  const botInfo = await telegramBot.telegram.getMe();
  console.log(`Telegram bot logged in as ${botInfo.username}`);
}

export async function handleTelegramMessage(message: TelegramMessage) {
  try {
    if (!message.content) {
      return;
    }

    const userId = message.author.id.toString();
    const text = message.content;

    // Find or create user using Telegram user ID
    const user = await findOrCreateUser(userId, {
      username:
        message.author.username || message.author.first_name || 'Unknown',
    });

    // Parse the message using LLM
    const llmResponse = await parseMessage(text);

    if (llmResponse.type === 'conversation') {
      await sendTelegramMessage(message.chatId, llmResponse.message!);
      return;
    }

    if (llmResponse.type === 'expense' && llmResponse.expense) {
      const parsedExpense = llmResponse.expense;

      // Add the expense to the database
      await addExpense({
        userId: user.id,
        amount: parsedExpense.amount,
        category: parsedExpense.category,
        description: parsedExpense.description,
        transactionDate: parsedExpense.date,
      });

      // Get monthly totals
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const monthlyTotal = await getMonthlyTotal(
        user.id,
        currentYear,
        currentMonth,
      );
      const categoryTotal = await getCategoryTotal(
        user.id,
        parsedExpense.category,
        currentYear,
        currentMonth,
      );

      // Format response
      const monthName = new Date(
        currentYear,
        currentMonth - 1,
      ).toLocaleDateString('en-US', {month: 'long'});
      const response = `Got it! Added $${parsedExpense.amount} under ${parsedExpense.category} category. Your total for ${monthName} is $${monthlyTotal.toFixed(2)} and ${parsedExpense.category} total is $${categoryTotal.toFixed(2)}.`;

      await sendTelegramMessage(message.chatId, response);
    }
  } catch (error) {
    console.error('Error processing Telegram message:', error);
    await sendTelegramMessage(message.chatId, 'Sorry, something went wrong.');
  }
}
