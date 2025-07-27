import OpenAI from 'openai';
import {EXPENSE_CATEGORIES, type ExpenseCategory} from './categories';
import dotenv from 'dotenv';
import logger from '../utils/logger';
import {subDays, subMonths, format} from 'date-fns';
import {
  getCurrentPSTDate,
  parseUserDateInput,
  startOfDayPSTFromString,
  endOfDayPSTFromString,
} from '../utils/timezone';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ParsedExpense {
  amount: number;
  category: ExpenseCategory;
  date: Date | null;
  description: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
  description: string;
  showCategoryBreakdown?: boolean;
}

export interface LLMResponse {
  type: 'expense' | 'conversation' | 'spending_breakdown' | 'transaction_list';
  expense?: ParsedExpense;
  message?: string;
  timeRange?: TimeRange;
}

export interface SpendingBreakdownContext {
  description: string;
  totalAmount: number;
  totalTransactions: number;
  categories: Array<{
    category: string;
    total: number;
    count: number;
  }>;
}

export interface TransactionListContext {
  description: string;
  totalCount: number;
  hasMore: boolean;
  transactions: Array<{
    amount: string | number;
    description: string;
    category: string;
    transactionDate: string | Date;
  }>;
}

export interface ExpenseConfirmationContext {
  amount: number;
  category: string;
  description: string;
  monthlyTotal: number;
  categoryTotal: number;
  monthName: string;
}

export async function parseMessage(message: string): Promise<LLMResponse> {
  try {
    logger.debug(`Parsing message with LLM: "${message}"`);

    const currentPSTDate = getCurrentPSTDate();
    const currentDate = format(currentPSTDate, 'yyyy-MM-dd');

    // Calculate relative dates for examples using PST timezone
    const yesterday = format(subDays(currentPSTDate, 1), 'yyyy-MM-dd');
    const twoDaysAgo = format(subDays(currentPSTDate, 2), 'yyyy-MM-dd');
    const lastWeekStart = format(subDays(currentPSTDate, 7), 'yyyy-MM-dd');
    const lastWeekEnd = format(subDays(currentPSTDate, 1), 'yyyy-MM-dd');
    const twoMonthsAgo = format(subMonths(currentPSTDate, 2), 'yyyy-MM-dd');

    const prompt = `You are a flamboyant sassy Monstera Money Bot assistant. Analyze this message and determine if it's an expense, spending total request, spending breakdown request, transaction list request, or general conversation.

Message: "${message}"
Current Date (PST): ${currentDate}

If this is an EXPENSE message, extract:
1. Amount (as a number, no currency symbols)
2. Category (must be one of: ${EXPENSE_CATEGORIES.join(', ')})
3. Date (if mentioned, otherwise null - we'll use today's date)
4. Description (clean, concise description of the expense)

If this is a SPENDING request (asking about spending over time), extract:
1. Start date (calculate from current date based on the time range)
2. End date (usually current date unless specified)
3. Description of the time period
4. Whether user wants category breakdown (true if they specifically ask for "breakdown", "categories", "by category", or similar; false for simple "how much spent" questions)

If this is a TRANSACTION LIST request (asking for specific transactions/list of expenses), extract:
1. Start date (calculate from current date based on the time range)
2. End date (usually current date unless specified)
3. Description of the time period

If this is GENERAL CONVERSATION (greetings, questions, unrelated chat), provide a brief, friendly response.

Respond ONLY with a JSON object in one of these formats:

For expenses:
{
  "type": "expense",
  "expense": {
    "amount": number,
    "category": "exact category name from list",
    "date": "YYYY-MM-DD" or null,
    "description": "brief description"
  }
}

For spending requests:
{
  "type": "spending_breakdown",
  "timeRange": {
    "start": "YYYY-MM-DD",
    "end": "YYYY-MM-DD",
    "description": "brief description of time period",
    "showCategoryBreakdown": boolean
  }
}

For transaction list (specific transactions):
{
  "type": "transaction_list",
  "timeRange": {
    "start": "YYYY-MM-DD",
    "end": "YYYY-MM-DD",
    "description": "brief description of time period"
  }
}

For conversation:
{
  "type": "conversation",
  "message": "brief friendly response (1-2 sentences max)"
}

Examples:
- "spent 30 bucks on coffee this morning" → {"type": "expense", "expense": {"amount": 30, "category": "Food & Drinks", "date": null, "description": "coffee"}}
- "how much have I spent the past 2 days" → {"type": "spending_breakdown", "timeRange": {"start": "${twoDaysAgo}", "end": "${currentDate}", "description": "past 2 days", "showCategoryBreakdown": false}}
- "what has my spending been the past 2 months" → {"type": "spending_breakdown", "timeRange": {"start": "${twoMonthsAgo}", "end": "${currentDate}", "description": "past 2 months", "showCategoryBreakdown": false}}
- "show me breakdown by category last week" → {"type": "spending_breakdown", "timeRange": {"start": "${lastWeekStart}", "end": "${lastWeekEnd}", "description": "last week", "showCategoryBreakdown": true}}
- "categories breakdown this month" → {"type": "spending_breakdown", "timeRange": {"start": "${currentDate}", "end": "${currentDate}", "description": "this month", "showCategoryBreakdown": true}}
- "what were my transactions the past 2 days" → {"type": "transaction_list", "timeRange": {"start": "${twoDaysAgo}", "end": "${currentDate}", "description": "past 2 days"}}
- "list my purchases yesterday" → {"type": "transaction_list", "timeRange": {"start": "${yesterday}", "end": "${yesterday}", "description": "yesterday"}}
- "hello how are you?" → {"type": "conversation", "message": "I'm here to help you track your expenses. Just tell me what you spent money on...or don't, see if I care."}`;

    logger.debug(
      `Making OpenAI API request with model: ${process.env.OPENAI_MODEL || 'gpt-4o-mini'}`,
    );

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 250,
    });

    const content = response.choices[0]?.message?.content?.trim();
    logger.debug(`OpenAI response: ${content}`);

    if (!content) {
      logger.warn('OpenAI returned empty response');
      return {
        type: 'conversation',
        message: 'Sorry, I didn\'t understand that. Could you try again?',
      };
    }

    const parsed = JSON.parse(content);
    logger.debug(`Parsed LLM response type: ${parsed.type}`);

    if (parsed.type === 'conversation') {
      logger.info('Message classified as conversation');
      return {
        type: 'conversation',
        message: parsed.message || 'Thanks for chatting!',
      };
    }


    if (parsed.type === 'spending_breakdown' && parsed.timeRange) {
      const timeRange = parsed.timeRange;
      logger.debug(
        `Validating spending breakdown: start=${timeRange.start}, end=${timeRange.end}, showCategoryBreakdown=${timeRange.showCategoryBreakdown}`,
      );

      if (!timeRange.start || !timeRange.end || !timeRange.description || (timeRange.showCategoryBreakdown !== undefined && typeof timeRange.showCategoryBreakdown !== 'boolean')) {
        logger.warn('Spending breakdown validation failed', timeRange);
        return {
          type: 'conversation',
          message:
            'I couldn\'t understand the time range. Could you be more specific about the period you want to see?',
        };
      }

      logger.info(
        `Valid spending breakdown request for: ${timeRange.description} (showCategoryBreakdown: ${timeRange.showCategoryBreakdown})`,
      );
      return {
        type: 'spending_breakdown',
        timeRange: {
          start: startOfDayPSTFromString(timeRange.start),
          end: endOfDayPSTFromString(timeRange.end),
          description: timeRange.description,
          showCategoryBreakdown: timeRange.showCategoryBreakdown,
        },
      };
    }

    if (parsed.type === 'transaction_list' && parsed.timeRange) {
      const timeRange = parsed.timeRange;
      logger.debug(
        `Validating transaction list: start=${timeRange.start}, end=${timeRange.end}`,
      );

      if (!timeRange.start || !timeRange.end || !timeRange.description) {
        logger.warn('Transaction list validation failed', timeRange);
        return {
          type: 'conversation',
          message:
            'I couldn\'t understand the time range. Could you be more specific about the period you want to see?',
        };
      }

      logger.info(
        `Valid transaction list request for: ${timeRange.description}`,
      );

      return {
        type: 'transaction_list',
        timeRange: {
          start: startOfDayPSTFromString(timeRange.start),
          end: endOfDayPSTFromString(timeRange.end),
          description: timeRange.description,
        },
      };
    }

    if (parsed.type === 'expense' && parsed.expense) {
      const expense = parsed.expense;
      logger.debug(
        `Validating expense: amount=${expense.amount}, category=${expense.category}`,
      );

      // Validate the expense data
      if (
        typeof expense.amount !== 'number' ||
        !EXPENSE_CATEGORIES.includes(expense.category) ||
        !expense.description
      ) {
        logger.warn('Expense validation failed', {
          amount: expense.amount,
          category: expense.category,
          date: expense.date,
          description: expense.description,
        });
        return {
          type: 'conversation',
          message:
            'I couldn\'t parse that as an expense. Could you be more specific about the amount and what you spent it on?',
        };
      }

      logger.info(
        `Valid expense parsed: $${expense.amount} for ${expense.category}`,
      );
      return {
        type: 'expense',
        expense: {
          amount: expense.amount,
          category: expense.category,
          date: expense.date
            ? parseUserDateInput(expense.date)
            : parseUserDateInput(null),
          description: expense.description,
        },
      };
    }

    logger.warn('Unexpected LLM response format');
    return {
      type: 'conversation',
      message:
        'I\'m not sure how to help with that. Try telling me about an expense you\'d like to track!',
    };
  } catch (error) {
    logger.error('Error parsing message with LLM:', error);
    return {
      type: 'conversation',
      message: 'Sorry, something went wrong. Could you try again?',
    };
  }
}

export async function generateSassyResponse(
  type: 'spending_breakdown',
  context: SpendingBreakdownContext,
): Promise<string>;
export async function generateSassyResponse(
  type: 'transaction_list',
  context: TransactionListContext,
): Promise<string>;
export async function generateSassyResponse(
  type: 'expense_confirmation',
  context: ExpenseConfirmationContext,
): Promise<string>;
export async function generateSassyResponse(
  type: 'spending_breakdown' | 'transaction_list' | 'expense_confirmation',
  context:
    | SpendingBreakdownContext
    | TransactionListContext
    | ExpenseConfirmationContext,
): Promise<string> {
  try {
    logger.debug(`Generating sassy response for type: ${type}`);

    let prompt = '';

    if (type === 'spending_breakdown') {
      const spendingContext = context as SpendingBreakdownContext;
      const {description, totalAmount, totalTransactions} = spendingContext;
      prompt = `You are a sassy Monstera Money Bot. Write a SHORT one-line intro for a spending breakdown for ${description}. Total: $${totalAmount.toFixed(2)}, ${totalTransactions} transactions. Be flamboyant and sassy but VERY brief - max 15 words. Use MAXIMUM ONE emoji when applicable, never more than one. Use plain text only, no markdown. Do not include quotes in your response.

Examples (without quotes):
💸 Honey, here's your spending tea for last week...
Babe, your wallet took some HITS this month...
Darling, let's spill the financial facts...
Girl, time to face the spending music...
Sweetie, your money moves are questionable...`;
    } else if (type === 'transaction_list') {
      const transactionContext = context as TransactionListContext;
      const {description, totalCount} = transactionContext;
      prompt = `You are a sassy Monstera Money Bot. Write a SHORT one-line intro for a transaction list for ${description}. ${totalCount} transactions total. Be flamboyant and sassy but VERY brief - max 15 words. Use MAXIMUM ONE emoji when applicable, never more than one. Use plain text only, no markdown. Do not include quotes in your response.

Examples (without quotes):
📋 Sweetie, here's where your money went...
Baby, your spending receipts are READY...
Hun, let's review your financial choices...
Darling, time to see your money trail...
Babe, your transaction history is calling...`;
    } else if (type === 'expense_confirmation') {
      const expenseContext = context as ExpenseConfirmationContext;
      const {amount, category, monthlyTotal, categoryTotal, monthName} =
        expenseContext;
      prompt = `You are a sassy Monstera Money Bot. Write a SHORT confirmation that $${amount} for ${category} was recorded. Monthly total: $${monthlyTotal.toFixed(2)}, ${category} total: $${categoryTotal.toFixed(2)} for ${monthName}. Be sassy but VERY brief - max 20 words. Use MAXIMUM ONE emoji when applicable, never more than one. Use plain text only, no markdown. Do not include quotes in your response.

Examples (without quotes):
💅 Noted! $50 nails habit is real. Monthly total: $500, Health Care total: $150
Logged your $25 food splurge! You're at $800 this month, Food at $300
Got it babe! $50 shopping spree recorded. Monthly: $600, Shopping: $200
Recorded honey! $40 gas expense. Monthly: $700, Transportation: $180
Sure thing! $15 coffee addiction noted. Monthly: $450, Food: $200`;
    }

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 100,
    });

    const content = response.choices[0]?.message?.content?.trim();
    logger.debug(`Generated sassy response: ${content}`);

    if (!content) {
      logger.warn('OpenAI returned empty sassy response');
      return 'Darling, something went wrong with my fabulous response generator! 💅✨';
    }

    return content;
  } catch (error) {
    logger.error('Error generating sassy response:', error);
    return 'Honey, my sass machine is temporarily broken, but your expense is still recorded! 💸💅';
  }
}
