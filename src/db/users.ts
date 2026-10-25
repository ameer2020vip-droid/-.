import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(
  uid: string,
  email: string,
  fullName?: string,
  role?: string,
  schoolId?: string
) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        fullName,
        role,
        schoolId,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(fullName ? { fullName } : {}),
          ...(role ? { role } : {}),
          ...(schoolId ? { schoolId } : {}),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('Database operation failed.', { cause: error });
  }
}

export async function getUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
