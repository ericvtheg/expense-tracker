import express from 'express';
import dotenv from 'dotenv';
import {sql} from 'drizzle-orm';
import {db} from './db';
import {startPolling} from './services/telegram-polling';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.get('/', async (req, res) => {
	const result = await db.execute(sql`SELECT NOW()`);
	res.send(`Hello, World! The time from the DB is ${result[0].now}`);
});

// Start Telegram polling
startPolling();

app.listen(port, () => {
	console.log(`Expense tracker bot listening at http://localhost:${port}`);
	console.log('Send messages to your Telegram bot to test expense tracking!');
});
