import bodyParser from 'body-parser';
import express from 'express';
import dotenv from 'dotenv';
import {sql} from 'drizzle-orm';
import {migrate} from 'drizzle-orm/postgres-js/migrator';
import {db} from './db';
import {telegramBot, initializeTelegramBot, handleTelegramMessage, type TelegramMessage} from './services/telegram';

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


// Initialize app with migrations
async function startApp() {
  await runMigrations();

  // Initialize Telegram bot
  await initializeTelegramBot();

  // Set up Telegram message event handler
  telegramBot.on('text', async (ctx) => {
    const message = ctx.message;
    
    await handleTelegramMessage({
      id: message.message_id,
      author: {
        id: message.from.id,
        username: message.from.username,
        first_name: message.from.first_name,
      },
      content: message.text,
      chatId: message.chat.id,
    });
  });

  // Start the Telegram bot
  telegramBot.launch();

  app.listen(port, () => {
    console.log(`Expense tracker bot listening at http://localhost:${port}`);
  });

  // Enable graceful stop
  process.once('SIGINT', () => telegramBot.stop('SIGINT'));
  process.once('SIGTERM', () => telegramBot.stop('SIGTERM'));
}

startApp().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
