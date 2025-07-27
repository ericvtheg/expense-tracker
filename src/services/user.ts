import {eq} from 'drizzle-orm';
import {db} from '../db';
import {users, type User, type NewUser} from '../db/schema';

export async function findOrCreateUser(
  phoneNumber: string,
  userInfo: {
    username: string;
  },
): Promise<User> {
  // Try to find existing user
  const existingUser = await db.query.users.findFirst({
    where: eq(users.phoneNumber, phoneNumber),
  });

  if (existingUser) {
    return existingUser;
  }

  // Create new user
  const newUser: NewUser = {
    phoneNumber,
    username: userInfo.username,
  };

  const [createdUser] = await db.insert(users).values(newUser).returning();
  return createdUser;
}
