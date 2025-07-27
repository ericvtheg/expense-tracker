import {Client, GatewayIntentBits, ActivityType} from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

export const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildPresences,
  ],
});

export interface DiscordMessage {
  id: string;
  author: {
    id: string;
    username: string;
  };
  content: string;
  channelId: string;
}

export async function sendDiscordMessage(
  channelId: string,
  content: string,
): Promise<void> {
  const channel = await discordClient.channels.fetch(channelId);
  if (channel?.isTextBased() && 'send' in channel) {
    await channel.send(content);
  }
}

export async function initializeDiscordBot(): Promise<void> {
  await discordClient.login(process.env.DISCORD_BOT_TOKEN!);
  
  discordClient.user?.setPresence({
    activities: [{
      name: 'expense tracking',
      type: ActivityType.Watching
    }],
    status: 'online'
  });
  
  console.log(`Discord bot logged in as ${discordClient.user?.tag}`);
}
