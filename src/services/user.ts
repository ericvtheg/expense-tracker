import {eq} from 'drizzle-orm';
import {db} from '../db';
import {users, type User, type NewUser} from '../db/schema';

export async function findOrCreateUser(telegramUserId: string, userInfo: {
	firstName?: string;
	lastName?: string;
	username?: string;
}): Promise<User> {
  // Try to find existing user
  const existingUser = await db.query.users.findFirst({
    where: eq(users.telegramUserId, telegramUserId),
  });

  if (existingUser) {
    return existingUser;
  }

  // Create new user
  const newUser: NewUser = {
    telegramUserId,
    firstName: userInfo.firstName,
    lastName: userInfo.lastName,
    username: userInfo.username,
  };

  const [createdUser] = await db.insert(users).values(newUser).returning();
  return createdUser;
}
