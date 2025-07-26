import TelegramBot from 'node-telegram-bot-api';

export const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, {polling: false});

export interface TelegramMessage {
	message_id: number;
	from: {
		id: number;
		is_bot: boolean;
		first_name: string;
		last_name?: string;
		username?: string;
	};
	chat: {
		id: number;
		first_name: string;
		last_name?: string;
		username?: string;
		type: string;
	};
	date: number;
	text?: string;
}