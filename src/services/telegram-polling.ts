import TelegramBot from 'node-telegram-bot-api';
import { parseExpenseMessage } from './llm';
import { findOrCreateUser } from './user';
import { addExpense, getMonthlyTotal, getCategoryTotal } from './expense';

export const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, {
	polling: true,
});

export function startPolling() {
	bot.on('message', async (msg) => {
		try {
			if (!msg.text) return;

			const chatId = msg.chat.id;
			const text = msg.text;

			// Find or create user
			const user = await findOrCreateUser(msg.from!.id.toString(), {
				firstName: msg.from!.first_name,
				lastName: msg.from!.last_name,
				username: msg.from!.username,
			});

			// Parse the expense message using LLM
			const parsedExpense = await parseExpenseMessage(text);

			if (!parsedExpense) {
				await bot.sendMessage(chatId, 'I don\'t understand, please try again');
				return;
			}

			// Add the expense to the database
			await addExpense({
				userId: user.id,
				amount: parsedExpense.amount,
				category: parsedExpense.category,
				description: parsedExpense.description,
				transactionDate: parsedExpense.date,
			});

			// Get monthly totals
			const now = new Date();
			const currentMonth = now.getMonth() + 1;
			const currentYear = now.getFullYear();

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

			// Format response
			const monthName = new Date(
				currentYear,
				currentMonth - 1,
			).toLocaleDateString('en-US', { month: 'long' });
			const response = `Got it! Added $${parsedExpense.amount} under ${parsedExpense.category} category. Your total for ${monthName} is $${monthlyTotal.toFixed(2)} and ${parsedExpense.category} total is $${categoryTotal.toFixed(2)}.`;

			await bot.sendMessage(chatId, response);
		} catch (error) {
			console.error('Error processing message:', error);
		}
	});

	console.log('Telegram bot polling started...');
}

