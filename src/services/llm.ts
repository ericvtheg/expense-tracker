import OpenAI from 'openai';
import {EXPENSE_CATEGORIES, type ExpenseCategory} from './categories';

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export interface ParsedExpense {
	amount: number;
	category: ExpenseCategory;
	date: Date;
	description: string;
}

export async function parseExpenseMessage(message: string): Promise<ParsedExpense | null> {
	const prompt = `You are an expense tracker assistant. Parse this message and extract expense information.

Message: "${message}"

Extract:
1. Amount (as a number, no currency symbols)
2. Category (must be one of: ${EXPENSE_CATEGORIES.join(', ')})
3. Date (if mentioned, otherwise use today's date)
4. Description (clean, concise description of the expense)

Respond ONLY with a JSON object in this exact format:
{
  "amount": number,
  "category": "exact category name from list",
  "date": "YYYY-MM-DD",
  "description": "brief description"
}

If you cannot parse the message or extract required information, respond with: null

Examples:
- "spent 30 bucks on coffee this morning" → {"amount": 30, "category": "Food & Drinks", "date": "2024-01-01", "description": "coffee"}
- "1500 flight ticket last tuesday" → {"amount": 1500, "category": "Travel", "date": "2023-12-26", "description": "flight ticket"}`;

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
		if (!content || content === 'null') {
			return null;
		}

		const parsed = JSON.parse(content);
		
		// Validate the parsed response
		if (
			typeof parsed.amount !== 'number' ||
			!EXPENSE_CATEGORIES.includes(parsed.category) ||
			!parsed.date ||
			!parsed.description
		) {
			return null;
		}

		return {
			amount: parsed.amount,
			category: parsed.category,
			date: new Date(parsed.date),
			description: parsed.description,
		};
	} catch (error) {
		console.error('Error parsing expense message:', error);
		return null;
	}
}