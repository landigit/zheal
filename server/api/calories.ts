import { db } from '../../server/db/client';
import { calorieLogs } from '../../server/db/schema';
import { desc, sql } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  if (event.method === 'GET') {
    const logs = await db.query.calorieLogs.findMany({
      where: (logs, { sql }) => sql`date(${logs.loggedAt}) = date('now')`,
      orderBy: [desc(calorieLogs.loggedAt)],
    });
    
    const totalToday = logs.reduce((sum, log) => sum + log.calories, 0);
    
    return { logs, totalToday };
  }

  if (event.method === 'POST') {
    const body = await readBody(event);
    const { userId, foodName, calories, mealType, isPackaged } = body;
    
    await db.insert(calorieLogs).values({
      userId,
      foodName,
      calories,
      mealType,
      isPackaged: !!isPackaged,
    });
    
    return { status: 'logged' };
  }
});
