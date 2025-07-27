import OpenAI from 'openai';
import {EXPENSE_CATEGORIES, type ExpenseCategory} from './categories';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ParsedExpense {
  amount: number;
  category: ExpenseCategory;
  date: Date;
  description: string;
}

export interface LLMResponse {
  type: 'expense' | 'conversation';
  expense?: ParsedExpense;
  message?: string;
}

export async function parseMessage(
  message: string,
): Promise<LLMResponse> {
  const prompt = `You are a friendly expense tracker assistant. Analyze this message and determine if it's an expense or general conversation.

Message: "${message}"

If this is an EXPENSE message, extract:
1. Amount (as a number, no currency symbols)
2. Category (must be one of: ${EXPENSE_CATEGORIES.join(', ')})
3. Date (if mentioned, otherwise use today's date)
4. Description (clean, concise description of the expense)

If this is GENERAL CONVERSATION (greetings, questions, unrelated chat), provide a brief, friendly response.

Respond ONLY with a JSON object in one of these formats:

For expenses:
{
  "type": "expense",
  "expense": {
    "amount": number,
    "category": "exact category name from list",
    "date": "YYYY-MM-DD",
    "description": "brief description"
  }
}

For conversation:
{
  "type": "conversation",
  "message": "brief friendly response (1-2 sentences max)"
}

Examples:
- "spent 30 bucks on coffee this morning" → {"type": "expense", "expense": {"amount": 30, "category": "Food & Drinks", "date": "2024-01-01", "description": "coffee"}}
- "hello how are you?" → {"type": "conversation", "message": "Hi there! I'm here to help you track your expenses. Just tell me what you spent money on!"}
- "what's the weather like" → {"type": "conversation", "message": "I'm an expense tracker, so I don't know about weather. But I can help you track any spending!"}`;

  try {
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
    if (!content) {
      return {
        type: 'conversation',
        message: 'Sorry, I didn\'t understand that. Could you try again?',
      };
    }

    const parsed = JSON.parse(content);

    if (parsed.type === 'conversation') {
      return {
        type: 'conversation',
        message: parsed.message || 'Thanks for chatting!',
      };
    }

    if (parsed.type === 'expense' && parsed.expense) {
      const expense = parsed.expense;
      // Validate the expense data
      if (
        typeof expense.amount !== 'number' ||
        !EXPENSE_CATEGORIES.includes(expense.category) ||
        !expense.date ||
        !expense.description
      ) {
        return {
          type: 'conversation',
          message: 'I couldn\'t parse that as an expense. Could you be more specific about the amount and what you spent it on?',
        };
      }

      return {
        type: 'expense',
        expense: {
          amount: expense.amount,
          category: expense.category,
          date: new Date(expense.date),
          description: expense.description,
        },
      };
    }

    return {
      type: 'conversation',
      message: 'I\'m not sure how to help with that. Try telling me about an expense you\'d like to track!',
    };
  } catch (error) {
    console.error('Error parsing message:', error);
    return {
      type: 'conversation',
      message: 'Sorry, something went wrong. Could you try again?',
    };
  }
}

