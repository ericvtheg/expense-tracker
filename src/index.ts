import bodyParser from 'body-parser';
import express from 'express';
import dotenv from 'dotenv';
import {sql} from 'drizzle-orm';
import {migrate} from 'drizzle-orm/postgres-js/migrator';
import {db} from './db';
import {discordClient, initializeDiscordBot, sendDiscordMessage, type DiscordMessage} from './services/discord';
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

// Discord message handler
async function handleDiscordMessage(message: DiscordMessage) {
  try {
    if (!message.content) {
      return;
    }

    const userId = message.author.id;
    const text = message.content;

    // Find or create user using Discord user ID
    const user = await findOrCreateUser(userId, {
      username: message.author.username,
    });

    // Parse the expense message using LLM
    const parsedExpense = await parseExpenseMessage(text);

    if (!parsedExpense) {
      await sendDiscordMessage(message.channelId, 'I don\'t understand, please try again');
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
    ).toLocaleDateString('en-US', {month: 'long'});
    const response = `Got it! Added $${parsedExpense.amount} under ${parsedExpense.category} category. Your total for ${monthName} is $${monthlyTotal.toFixed(2)} and ${parsedExpense.category} total is $${categoryTotal.toFixed(2)}.`;

    await sendDiscordMessage(message.channelId, response);
  } catch (error) {
    console.error('Error processing Discord message:', error);
    await sendDiscordMessage(message.channelId, 'Sorry, something went wrong processing your expense.');
  }
}

// Initialize app with migrations
async function startApp() {
  await runMigrations();

  // Initialize Discord bot
  await initializeDiscordBot();

  // Set up Discord message event handler
  discordClient.on('messageCreate', async(message) => {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Only respond to direct messages or mentions
    if (!message.guild && message.channel.type === 1) { // DM
      await handleDiscordMessage({
        id: message.id,
        author: {
          id: message.author.id,
          username: message.author.username,
        },
        content: message.content,
        channelId: message.channelId,
      });
    } else if (message.mentions.has(discordClient.user!)) { // Mentioned in server
      await handleDiscordMessage({
        id: message.id,
        author: {
          id: message.author.id,
          username: message.author.username,
        },
        content: message.content.replace(`<@${discordClient.user!.id}>`, '').trim(),
        channelId: message.channelId,
      });
    }
  });

  app.listen(port, () => {
    console.log(`Expense tracker bot listening at http://localhost:${port}`);
  });
}

startApp().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
