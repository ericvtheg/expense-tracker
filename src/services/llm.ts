import OpenAI from 'openai';
import {EXPENSE_CATEGORIES, type ExpenseCategory} from './categories';
import dotenv from 'dotenv';
import logger from '../utils/logger';

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
}

export interface LLMResponse {
  type: 'expense' | 'conversation' | 'spending_breakdown';
  expense?: ParsedExpense;
  message?: string;
  timeRange?: TimeRange;
}

export async function parseMessage(
  message: string,
): Promise<LLMResponse> {
  try {
    logger.debug(`Parsing message with LLM: "${message}"`);

    const currentDate = new Date().toISOString().split('T')[0];
    
    const prompt = `You are a friendly expense tracker assistant. Analyze this message and determine if it's an expense, spending breakdown request, or general conversation.

Message: "${message}"
Current Date: ${currentDate}

If this is an EXPENSE message, extract:
1. Amount (as a number, no currency symbols)
2. Category (must be one of: ${EXPENSE_CATEGORIES.join(', ')})
3. Date (if mentioned, otherwise null - we'll use today's date)
4. Description (clean, concise description of the expense)

If this is a SPENDING BREAKDOWN request (asking about spending over time), extract:
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

For spending breakdown:
{
  "type": "spending_breakdown",
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
- "what has my spending been the past 2 months" → {"type": "spending_breakdown", "timeRange": {"start": "2025-05-27", "end": "${currentDate}", "description": "past 2 months"}}
- "show me my expenses from last week" → {"type": "spending_breakdown", "timeRange": {"start": "2025-07-14", "end": "2025-07-20", "description": "last week"}}
- "hello how are you?" → {"type": "conversation", "message": "Hi there! I'm here to help you track your expenses. Just tell me what you spent money on!"}`;

    logger.debug(`Making OpenAI API request with model: ${process.env.OPENAI_MODEL || 'gpt-3.5-turbo'}`);

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 200,
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
      logger.debug(`Validating spending breakdown: start=${timeRange.start}, end=${timeRange.end}`);

      if (!timeRange.start || !timeRange.end || !timeRange.description) {
        logger.warn('Spending breakdown validation failed', timeRange);
        return {
          type: 'conversation',
          message: 'I couldn\'t understand the time range. Could you be more specific about the period you want to see?',
        };
      }

      logger.info(`Valid spending breakdown request for: ${timeRange.description}`);
      return {
        type: 'spending_breakdown',
        timeRange: {
          start: new Date(timeRange.start),
          end: new Date(timeRange.end),
          description: timeRange.description,
        },
      };
    }

    if (parsed.type === 'expense' && parsed.expense) {
      const expense = parsed.expense;
      logger.debug(`Validating expense: amount=${expense.amount}, category=${expense.category}`);

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
          message: 'I couldn\'t parse that as an expense. Could you be more specific about the amount and what you spent it on?',
        };
      }

      logger.info(`Valid expense parsed: $${expense.amount} for ${expense.category}`);
      return {
        type: 'expense',
        expense: {
          amount: expense.amount,
          category: expense.category,
          date: expense.date ? new Date(expense.date) : null,
          description: expense.description,
        },
      };
    }

    logger.warn('Unexpected LLM response format');
    return {
      type: 'conversation',
      message: 'I\'m not sure how to help with that. Try telling me about an expense you\'d like to track!',
    };
  } catch (error) {
    logger.error('Error parsing message with LLM:', error);
    return {
      type: 'conversation',
      message: 'Sorry, something went wrong. Could you try again?',
    };
  }
}

