import { db } from '../../server/db/client';
import { remedies, remedyUsage } from '../../server/db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  if (event.method === 'GET') {
    // Get all remedies and left join with their usage (for a specific user if needed, but here simple join)
    return await db.select()
      .from(remedies)
      .leftJoin(remedyUsage, eq(remedies.id, remedyUsage.remedyId));
  }

  // POST to log a user starting a remedy
  if (event.method === 'POST') {
    const body = await readBody(event);
    const { userId, remedyId } = body;
    
    await db.insert(remedyUsage).values({
      userId,
      remedyId,
    });
    
    return { status: 'started' };
  }
});
