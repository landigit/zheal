import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { resolve } from 'path';

const client = createClient({
  url: `file:${resolve(process.cwd(), 'zheal.db')}`,
});

export const db = drizzle(client, { schema });
