import {eq, and, gte, lte, sum} from 'drizzle-orm';
import {db} from '../db';
import {
  transactions,
  type Transaction,
  type NewTransaction,
} from '../db/schema';
import type {ExpenseCategory} from './categories';
import logger from '../utils/logger';

export async function addExpense(expense: {
  userId: number;
  amount: number;
  category: ExpenseCategory;
  description: string;
  transactionDate: Date;
}): Promise<Transaction> {
  try {
    logger.debug(`Adding expense for user ${expense.userId}: $${expense.amount} in ${expense.category}`);
    
    const newTransaction: NewTransaction = {
      userId: expense.userId,
      amount: expense.amount.toString(),
      category: expense.category,
      description: expense.description,
      transactionDate: expense.transactionDate,
    };

    const [createdTransaction] = await db
      .insert(transactions)
      .values(newTransaction)
      .returning();
      
    logger.info(`Expense added successfully: Transaction ID ${createdTransaction.id}`);
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
    logger.debug(`Getting monthly total for user ${userId} for ${year}-${month}`);
    
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const result = await db
      .select({total: sum(transactions.amount)})
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.transactionDate, startOfMonth),
          lte(transactions.transactionDate, endOfMonth),
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
    logger.debug(`Getting category total for user ${userId}, category ${category} for ${year}-${month}`);
    
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const result = await db
      .select({total: sum(transactions.amount)})
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.category, category),
          gte(transactions.transactionDate, startOfMonth),
          lte(transactions.transactionDate, endOfMonth),
        ),
      );

    const total = Number(result[0]?.total) || 0;
    logger.debug(`Category ${category} total for user ${userId}: $${total}`);
    return total;
  } catch (error) {
    logger.error(`Failed to get category total for user ${userId}, category ${category}:`, error);
    throw error;
  }
}
