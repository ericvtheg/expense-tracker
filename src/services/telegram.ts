import {Telegraf} from 'telegraf';
import dotenv from 'dotenv';
import {findOrCreateUser} from './user';
import {parseMessage} from './llm';
import {addExpense, getMonthlyTotal, getCategoryTotal} from './expense';
import logger from '../utils/logger';

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
  try {
    logger.debug(`Sending message to chat ${chatId}: ${content}`);
    await telegramBot.telegram.sendMessage(chatId, content);
    logger.debug(`Message sent successfully to chat ${chatId}`);
  } catch (error) {
    logger.error(`Failed to send message to chat ${chatId}:`, error);
    throw error;
  }
}

export async function initializeTelegramBot(): Promise<void> {
  try {
    logger.info('Initializing Telegram bot...');
    const botInfo = await telegramBot.telegram.getMe();
    logger.info(`Telegram bot logged in as ${botInfo.username}`);
  } catch (error) {
    logger.error('Failed to initialize Telegram bot:', error);
    throw error;
  }
}

export async function handleTelegramMessage(message: TelegramMessage) {
  try {
    logger.info(`Processing message from user ${message.author.id} in chat ${message.chatId}`);
    
    if (!message.content) {
      logger.debug('Empty message content, skipping');
      return;
    }

    const userId = message.author.id.toString();
    const text = message.content;

    // Find or create user using Telegram user ID
    logger.debug(`Finding or creating user for Telegram ID: ${userId}`);
    const user = await findOrCreateUser(userId, {
      username:
        message.author.username || message.author.first_name || 'Unknown',
    });
    logger.debug(`User found/created: ${user.id}`);

    // Parse the message using LLM
    logger.debug(`Parsing message with LLM: "${text}"`);
    const llmResponse = await parseMessage(text);
    logger.debug(`LLM response type: ${llmResponse.type}`);

    if (llmResponse.type === 'conversation') {
      logger.info('Message identified as conversation');
      await sendTelegramMessage(message.chatId, llmResponse.message!);
      return;
    }

    if (llmResponse.type === 'expense' && llmResponse.expense) {
      const parsedExpense = llmResponse.expense;
      logger.info(`Processing expense: $${parsedExpense.amount} for category ${parsedExpense.category}`);

      // Add the expense to the database
      await addExpense({
        userId: user.id,
        amount: parsedExpense.amount,
        category: parsedExpense.category,
        description: parsedExpense.description,
        transactionDate: parsedExpense.date,
      });
      logger.debug('Expense added to database');

      // Get monthly totals
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      logger.debug(`Calculating totals for ${currentYear}-${currentMonth}`);
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
      logger.debug(`Monthly total: $${monthlyTotal}, Category total: $${categoryTotal}`);

      // Format response
      const monthName = new Date(
        currentYear,
        currentMonth - 1,
      ).toLocaleDateString('en-US', {month: 'long'});
      const response = `Got it! Added $${parsedExpense.amount} under ${parsedExpense.category} category. Your total for ${monthName} is $${monthlyTotal.toFixed(2)} and ${parsedExpense.category} total is $${categoryTotal.toFixed(2)}.`;

      await sendTelegramMessage(message.chatId, response);
      logger.info('Expense processed successfully');
    }
  } catch (error) {
    logger.error('Error processing Telegram message:', error);
    try {
      await sendTelegramMessage(message.chatId, 'Sorry, something went wrong.');
    } catch (sendError) {
      logger.error('Failed to send error message to user:', sendError);
    }
  }
}
