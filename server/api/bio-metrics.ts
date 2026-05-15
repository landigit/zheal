import { db } from '../../server/db/client';
import { bioMetrics } from '../../server/db/schema';
import { desc, eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  if (event.method === 'GET') {
    return await db.query.bioMetrics.findMany({
      orderBy: [desc(bioMetrics.recordedAt)],
      limit: 30,
    });
  }

  if (event.method === 'POST') {
    const body = await readBody(event);
    const { userId, weightKg, heightCm } = body;
    const bmi = +(weightKg / ((heightCm / 100) ** 2)).toFixed(1);
    
    await db.insert(bioMetrics).values({
      userId,
      bmi,
    });
    
    return { bmi, status: 'logged' };
  }
});
