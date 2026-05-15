import { db } from '../../server/db/client';
import { gutBrainLogs } from '../../server/db/schema';
import { desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  if (event.method === 'GET') {
    return await db.query.gutBrainLogs.findMany({
      orderBy: [desc(gutBrainLogs.loggedAt)],
      limit: 14,
    });
  }

  if (event.method === 'POST') {
    const body = await readBody(event);
    const { userId, moodScore, gutScore, abnormality, patternNote } = body;
    
    await db.insert(gutBrainLogs).values({
      userId,
      moodScore,
      gutScore,
      abnormality,
      patternNote,
    });
    
    return { status: 'logged' };
  }
});
