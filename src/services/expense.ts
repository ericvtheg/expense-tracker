import {eq, and, gte, lte, sum} from 'drizzle-orm';
import {db} from '../db';
import {transactions, type Transaction, type NewTransaction} from '../db/schema';
import type {ExpenseCategory} from './categories';

export async function addExpense(expense: {
	userId: number;
	amount: number;
	category: ExpenseCategory;
	description: string;
	transactionDate: Date;
}): Promise<Transaction> {
  const newTransaction: NewTransaction = {
    userId: expense.userId,
    amount: expense.amount.toString(),
    category: expense.category,
    description: expense.description,
    transactionDate: expense.transactionDate,
  };

  const [createdTransaction] = await db.insert(transactions).values(newTransaction).returning();
  return createdTransaction;
}

export async function getMonthlyTotal(userId: number, year: number, month: number): Promise<number> {
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

  return Number(result[0]?.total) || 0;
}

export async function getCategoryTotal(
  userId: number,
  category: ExpenseCategory,
  year: number,
  month: number,
): Promise<number> {
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

  return Number(result[0]?.total) || 0;
}
