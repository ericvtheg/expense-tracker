import {eq, and, gte, lte, sum, desc, count} from 'drizzle-orm';
import {startOfMonth, endOfMonth} from 'date-fns';
import {db} from '../db';
import {
  transactions,
  type Transaction,
  type NewTransaction,
} from '../db/schema';
import type {ExpenseCategory} from './categories';
import logger from '../utils/logger';
import {convertPSTToUTC} from '../utils/timezone';

export async function addExpense(expense: {
  userId: number;
  amount: number;
  category: ExpenseCategory;
  description: string;
  transactionDate: Date;
}): Promise<Transaction> {
  try {
    logger.debug(
      `Adding expense for user ${expense.userId}: $${expense.amount} in ${expense.category}`,
    );

    const newTransaction: NewTransaction = {
      userId: expense.userId,
      amount: expense.amount.toFixed(2),
      category: expense.category,
      description: expense.description,
      transactionDate: convertPSTToUTC(expense.transactionDate),
    };

    const [createdTransaction] = await db
      .insert(transactions)
      .values(newTransaction)
      .returning();

    logger.info(
      `Expense added successfully: Transaction ID ${createdTransaction.id}`,
    );
    return createdTransaction;
  } catch (error) {
    logger.error(`Failed to add expense for user ${expense.userId}:`, error);
    throw error;
  }
}

export async function getMonthlyTotal(
  userId: number,
  year: number,
  month: number,
): Promise<number> {
  try {
    logger.debug(
      `Getting monthly total for user ${userId} for ${year}-${month}`,
    );

    const monthStart = convertPSTToUTC(startOfMonth(new Date(year, month - 1)));
    const monthEnd = convertPSTToUTC(endOfMonth(new Date(year, month - 1)));

    const result = await db
      .select({total: sum(transactions.amount)})
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.transactionDate, monthStart),
          lte(transactions.transactionDate, monthEnd),
        ),
      );

    const total = Number(result[0]?.total) || 0;
    logger.debug(`Monthly total for user ${userId}: $${total}`);
    return total;
  } catch (error) {
    logger.error(`Failed to get monthly total for user ${userId}:`, error);
    throw error;
  }
}

export async function getCategoryTotal(
  userId: number,
  category: ExpenseCategory,
  year: number,
  month: number,
): Promise<number> {
  try {
    logger.debug(
      `Getting category total for user ${userId}, category ${category} for ${year}-${month}`,
    );

    const monthStart = convertPSTToUTC(startOfMonth(new Date(year, month - 1)));
    const monthEnd = convertPSTToUTC(endOfMonth(new Date(year, month - 1)));

    const result = await db
      .select({total: sum(transactions.amount)})
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.category, category),
          gte(transactions.transactionDate, monthStart),
          lte(transactions.transactionDate, monthEnd),
        ),
      );

    const total = Number(result[0]?.total) || 0;
    logger.debug(`Category ${category} total for user ${userId}: $${total}`);
    return total;
  } catch (error) {
    logger.error(
      `Failed to get category total for user ${userId}, category ${category}:`,
      error,
    );
    throw error;
  }
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  count: number;
}

export interface SpendingBreakdown {
  totalAmount: number;
  totalTransactions: number;
  categories: CategoryBreakdown[];
  timeRange: {
    start: Date;
    end: Date;
    description: string;
  };
}

export async function getSpendingBreakdown(
  userId: number,
  startDate: Date,
  endDate: Date,
  description: string,
  category?: string,
): Promise<SpendingBreakdown> {
  try {
    const utcStartDate = convertPSTToUTC(startDate);
    const utcEndDate = convertPSTToUTC(endDate);

    logger.debug(
      `Getting spending breakdown for user ${userId} from ${utcStartDate.toISOString()} to ${utcEndDate.toISOString()}${category ? ` for category: ${category}` : ''}`,
    );

    const whereConditions = [
      eq(transactions.userId, userId),
      gte(transactions.transactionDate, utcStartDate),
      lte(transactions.transactionDate, utcEndDate),
    ];

    if (category) {
      whereConditions.push(eq(transactions.category, category));
    }

    const result = await db
      .select({
        total: sum(transactions.amount),
        category: transactions.category,
        count: count(),
      })
      .from(transactions)
      .where(and(...whereConditions))
      .groupBy(transactions.category)
      .orderBy(desc(sum(transactions.amount)));

    const categories: CategoryBreakdown[] = result.map((row) => ({
      category: row.category || 'Unknown',
      total: Number(row.total) || 0,
      count: Number(row.count) || 0,
    }));

    const totalAmount = categories.reduce((sum, cat) => sum + cat.total, 0);
    const totalTransactions = categories.reduce(
      (sum, cat) => sum + cat.count,
      0,
    );

    logger.debug(
      `Spending breakdown for user ${userId}: $${totalAmount} across ${totalTransactions} transactions${category ? ` in ${category}` : ''}`,
    );

    return {
      totalAmount,
      totalTransactions,
      categories,
      timeRange: {
        start: startDate,
        end: endDate,
        description,
      },
    };
  } catch (error) {
    logger.error(`Failed to get spending breakdown for user ${userId}:`, error);
    throw error;
  }
}

export interface TransactionsList {
  transactions: Transaction[];
  totalCount: number;
  hasMore: boolean;
  timeRange: {
    start: Date;
    end: Date;
    description: string;
  };
}

export async function getTransactionsList(
  userId: number,
  startDate: Date,
  endDate: Date,
  description: string,
  limit: number = 15,
): Promise<TransactionsList> {
  try {
    const utcStartDate = convertPSTToUTC(startDate);
    const utcEndDate = convertPSTToUTC(endDate);

    logger.debug(
      `Getting transactions list for user ${userId} from ${utcStartDate.toISOString()} to ${utcEndDate.toISOString()}, limit ${limit}`,
    );

    // Get total count first
    const countResult = await db
      .select({count: count()})
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.transactionDate, utcStartDate),
          lte(transactions.transactionDate, utcEndDate),
        ),
      );

    const totalCount = Number(countResult[0]?.count) || 0;

    // Get the transactions with limit + 1 to check if there are more
    const result = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.transactionDate, utcStartDate),
          lte(transactions.transactionDate, utcEndDate),
        ),
      )
      .orderBy(desc(transactions.transactionDate))
      .limit(limit + 1);

    const hasMore = result.length > limit;
    const transactionsList = hasMore ? result.slice(0, limit) : result;

    logger.debug(
      `Found ${transactionsList.length} transactions for user ${userId} (${totalCount} total, hasMore: ${hasMore})`,
    );

    return {
      transactions: transactionsList,
      totalCount,
      hasMore,
      timeRange: {
        start: startDate,
        end: endDate,
        description,
      },
    };
  } catch (error) {
    logger.error(`Failed to get transactions list for user ${userId}:`, error);
    throw error;
  }
}
