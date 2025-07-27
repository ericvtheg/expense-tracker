import {eq} from 'drizzle-orm';
import {db} from '../db';
import {users, type User, type NewUser} from '../db/schema';
import logger from '../utils/logger';

export async function findOrCreateUser(
  telegramUserId: string,
  userInfo: {
    username: string;
  },
): Promise<User> {
  try {
    logger.debug(`Finding user with Telegram ID: ${telegramUserId}`);
    
    // Try to find existing user
    const existingUser = await db.query.users.findFirst({
      where: eq(users.telegramUserId, telegramUserId),
    });

    if (existingUser) {
      logger.debug(`Found existing user: ${existingUser.id} (${existingUser.username})`);
      return existingUser;
    }

    logger.info(`Creating new user for Telegram ID: ${telegramUserId} with username: ${userInfo.username}`);
    
    // Create new user
    const newUser: NewUser = {
      telegramUserId,
      username: userInfo.username,
    };

    const [createdUser] = await db.insert(users).values(newUser).returning();
    logger.info(`User created successfully: ${createdUser.id} (${createdUser.username})`);
    
    return createdUser;
  } catch (error) {
    logger.error(`Error finding or creating user for Telegram ID ${telegramUserId}:`, error);
    throw error;
  }
}
