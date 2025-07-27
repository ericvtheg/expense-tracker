import {Telegraf} from 'telegraf';
import dotenv from 'dotenv';
import {findOrCreateUser} from './user';
import {parseMessage, generateSassyResponse} from './llm';
import {
  addExpense,
  getMonthlyTotal,
  getCategoryTotal,
  getSpendingBreakdown,
  getTransactionsList,
} from './expense';
import logger from '../utils/logger';
import {formatDateForUser, getCurrentPSTDate} from '../utils/timezone';

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
    logger.info(
      `Processing message from user ${message.author.id} in chat ${message.chatId}`,
    );

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

    if (llmResponse.type === 'spending_breakdown' && llmResponse.timeRange) {
      const {start, end, description} = llmResponse.timeRange;
      logger.info(`Processing spending breakdown request for: ${description}`);

      const breakdown = await getSpendingBreakdown(
        user.id,
        start,
        end,
        description,
      );

      if (breakdown.totalTransactions === 0) {
        await sendTelegramMessage(
          message.chatId,
          `No expenses found for ${description}.`,
        );
        return;
      }

      const sassyResponse = await generateSassyResponse('spending_breakdown', {
        description,
        totalAmount: breakdown.totalAmount,
        totalTransactions: breakdown.totalTransactions,
        categories: breakdown.categories,
      });

      let response = sassyResponse + '\n\n';
      response += `Total: $${breakdown.totalAmount.toFixed(2)} (${breakdown.totalTransactions} transactions)\n\n`;
      response += 'By Category:\n';

      breakdown.categories.forEach((cat) => {
        const percentage = ((cat.total / breakdown.totalAmount) * 100).toFixed(
          1,
        );
        response += `• ${cat.category}: $${cat.total.toFixed(2)} (${cat.count} transactions, ${percentage}%)\n`;
      });

      await sendTelegramMessage(message.chatId, response);
      logger.info('Spending breakdown processed successfully');
      return;
    }

    if (llmResponse.type === 'transaction_list' && llmResponse.timeRange) {
      const {start, end, description} = llmResponse.timeRange;
      logger.info(`Processing transaction list request for: ${description}`);

      const transactionsList = await getTransactionsList(
        user.id,
        start,
        end,
        description,
      );

      if (transactionsList.totalCount === 0) {
        await sendTelegramMessage(
          message.chatId,
          `No transactions found for ${description}.`,
        );
        return;
      }

      const sassyResponse = await generateSassyResponse('transaction_list', {
        description,
        totalCount: transactionsList.totalCount,
        hasMore: transactionsList.hasMore,
        transactions: transactionsList.transactions,
      });

      let response = sassyResponse + '\n\n';

      transactionsList.transactions.forEach((transaction, index) => {
        const date = formatDateForUser(new Date(transaction.transactionDate));
        response += `${index + 1}. $${Number(transaction.amount).toFixed(2)} - ${transaction.category}\n`;
        response += `   ${transaction.description} (${date})\n\n`;
      });

      if (transactionsList.hasMore) {
        response += `Showing ${transactionsList.transactions.length} of ${transactionsList.totalCount} transactions\n`;
        response += '(Limited to 15 most recent transactions)';
      } else {
        response += `${transactionsList.totalCount} transactions total`;
      }

      await sendTelegramMessage(message.chatId, response);
      logger.info('Transaction list processed successfully');
      return;
    }

    if (llmResponse.type === 'expense' && llmResponse.expense) {
      const parsedExpense = llmResponse.expense;
      logger.info(
        `Processing expense: $${parsedExpense.amount} for category ${parsedExpense.category}`,
      );

      // Add the expense to the database
      await addExpense({
        userId: user.id,
        amount: parsedExpense.amount,
        category: parsedExpense.category,
        description: parsedExpense.description,
        transactionDate: parsedExpense.date || new Date(),
      });
      logger.debug('Expense added to database');

      // Get monthly totals using PST
      const now = getCurrentPSTDate();
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
      logger.debug(
        `Monthly total: $${monthlyTotal}, Category total: $${categoryTotal}`,
      );

      // Format response
      const monthName = new Date(
        currentYear,
        currentMonth - 1,
      ).toLocaleDateString('en-US', {month: 'long'});

      const response = await generateSassyResponse('expense_confirmation', {
        amount: parsedExpense.amount,
        category: parsedExpense.category,
        description: parsedExpense.description,
        monthlyTotal,
        categoryTotal,
        monthName,
      });

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
