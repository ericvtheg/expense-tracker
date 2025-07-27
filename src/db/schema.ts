import {
  pgTable,
  serial,
  text,
  decimal,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  phoneNumber: text('phone_number').notNull().unique(),
  username: text('username').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  amount: decimal('amount', {precision: 10, scale: 2}).notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  transactionDate: timestamp('transaction_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
