import bodyParser from 'body-parser';
import express from 'express';
import dotenv from 'dotenv';
import {sql} from 'drizzle-orm';
import {migrate} from 'drizzle-orm/postgres-js/migrator';
import {db} from './db';
import {twilioClient, type TwilioMessage} from './services/twilio';
import {parseExpenseMessage} from './services/llm';
import {findOrCreateUser} from './services/user';
import {
  addExpense,
  getMonthlyTotal,
  getCategoryTotal,
} from './services/expense';

dotenv.config();

// Run migrations on startup
async function runMigrations() {
  try {
    console.log('Running database migrations...');
    await migrate(db, {migrationsFolder: './drizzle'});
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.raw({type: 'application/vnd.custom-type'}));
app.use(bodyParser.text({type: 'text/html'}));

app.get('/', async(req, res) => {
  const result = await db.execute(sql`SELECT NOW()`);
  res.send(`Hello, World! The time from the DB is ${result[0].now}`);
});

// Twilio webhook endpoint for RCS messages
app.post('/webhook/twilio', async(req, res) => {
  try {
    const message: TwilioMessage = req.body;

    if (!message.Body) {
      return res.sendStatus(200);
    }

    const phoneNumber = message.From;
    const text = message.Body;

    // Find or create user using phone number
    const user = await findOrCreateUser(phoneNumber, {
      firstName: undefined,
      lastName: undefined,
    });

    // Parse the expense message using LLM
    const parsedExpense = await parseExpenseMessage(text);

    if (!parsedExpense) {
      await twilioClient.messages.create({
        body: 'I don\'t understand, please try again',
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: phoneNumber,
      });
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

    await twilioClient.messages.create({
      body: response,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: phoneNumber,
    });

    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.sendStatus(500);
  }
});

// Initialize app with migrations
async function startApp() {
  await runMigrations();

  app.listen(port, () => {
    console.log(`Expense tracker bot listening at http://localhost:${port}`);
  });
}

startApp().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
