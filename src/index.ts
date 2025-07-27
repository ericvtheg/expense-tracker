import bodyParser from 'body-parser';
import express from 'express';
import dotenv from 'dotenv';
import {sql} from 'drizzle-orm';
import {migrate} from 'drizzle-orm/postgres-js/migrator';
import {db} from './db';
import {
  telegramBot,
  initializeTelegramBot,
  handleTelegramMessage,
} from './services/telegram';
import logger from './utils/logger';

dotenv.config();

// Run migrations on startup
async function runMigrations() {
  try {
    logger.info('Running database migrations...');
    await migrate(db, {migrationsFolder: './drizzle'});
    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.raw({type: 'application/vnd.custom-type'}));
app.use(bodyParser.text({type: 'text/html'}));

app.get('/', async(req, res) => {
  try {
    logger.debug('Health check endpoint accessed');
    const result = await db.execute(sql`SELECT NOW()`);
    logger.debug('Database connection successful');
    res.send(`Hello, World! The time from the DB is ${result[0].now}`);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).send('Database connection failed');
  }
});

// Initialize app with migrations
async function startApp() {
  logger.info('Starting expense tracker application');
  
  await runMigrations();

  // Initialize Telegram bot
  logger.info('Initializing Telegram bot');
  await initializeTelegramBot();

  // Set up Telegram message event handler
  telegramBot.on('text', async(ctx) => {
    const message = ctx.message;
    logger.debug(`Received message from user ${message.from.id}: ${message.text}`);

    try {
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
    } catch (error) {
      logger.error('Error handling Telegram message:', error);
    }
  });

  // Start the Telegram bot
  logger.info('Launching Telegram bot');
  telegramBot.launch();

  app.listen(port, () => {
    logger.info(`Expense tracker bot listening at http://localhost:${port}`);
  });

  // Enable graceful stop
  process.once('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully');
    telegramBot.stop('SIGINT');
  });
  process.once('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    telegramBot.stop('SIGTERM');
  });
}

startApp().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});
