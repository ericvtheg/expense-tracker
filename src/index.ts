import bodyParser from 'body-parser';
import express from 'express';
import dotenv from 'dotenv';
import {sql} from 'drizzle-orm';
import {db} from './db';
import {bot, type TelegramMessage} from './services/telegram';
import {parseExpenseMessage} from './services/llm';
import {findOrCreateUser} from './services/user';
import {
  addExpense,
  getMonthlyTotal,
  getCategoryTotal,
} from './services/expense';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.raw({type: 'application/vnd.custom-type'}));
app.use(bodyParser.text({type: 'text/html'}));

app.get('/', async(req, res) => {
  const result = await db.execute(sql`SELECT NOW()`);
  res.send(`Hello, World! The time from the DB is ${result[0].now}`);
});

// Telegram webhook endpoint
app.post('/webhook/telegram', async(req, res) => {
  try {
    const update = req.body;

    if (!update.message?.text) {
      return res.sendStatus(200);
    }

    const message: TelegramMessage = update.message;
    const chatId = message.chat.id;
    const text = message.text;

    // Find or create user
    const user = await findOrCreateUser(message.from.id.toString(), {
      firstName: message.from.first_name,
      lastName: message.from.last_name,
      username: message.from.username,
    });

    // Parse the expense message using LLM
    const parsedExpense = await parseExpenseMessage(text!);

    if (!parsedExpense) {
      await bot.sendMessage(chatId, 'I don\'t understand, please try again');
      return res.sendStatus(200);
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
    ).toLocaleDateString('en-US', {month: 'long'});
    const response = `Got it! Added $${parsedExpense.amount} under ${parsedExpense.category} category. Your total for ${monthName} is $${monthlyTotal.toFixed(2)} and ${parsedExpense.category} total is $${categoryTotal.toFixed(2)}.`;

    await bot.sendMessage(chatId, response);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.sendStatus(500);
  }
});

app.listen(port, () => {
  console.log(`Expense tracker bot listening at http://localhost:${port}`);
});
