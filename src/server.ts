import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Client, Databases, ID } from 'node-appwrite';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Load and parse INDB CSV data on startup
const indbProducts = loadIndbCsv();
console.log(`Loaded ${indbProducts.length} items from Indian Nutrient Databank.`);

// Appwrite Configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || 'zheal-project';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'zheal-db';
const APPWRITE_COLLECTION_ID = process.env.APPWRITE_COLLECTION_ID || 'food-logs';

let appwriteDb: Databases | null = null;
let useLocalFallback = true;

// Food log interface for local fallback
interface FoodLog {
  id?: string;
  name: string;
  brand: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp?: string;
}

let localFoodLogs: FoodLog[] = [];

if (APPWRITE_API_KEY && APPWRITE_PROJECT_ID) {
  try {
    const client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    appwriteDb = new Databases(client);
    useLocalFallback = false;
    console.log('Appwrite client initialized successfully.');
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to initialize Appwrite client, falling back to local storage:', errMsg);
    useLocalFallback = true;
  }
} else {
  console.log('Appwrite API Key not configured. Using server in-memory fallback for food logs.');
  useLocalFallback = true;
}

// Ensure Appwrite database and collection exist
async function ensureAppwriteSetup(): Promise<void> {
  if (useLocalFallback || !appwriteDb) return;

  try {
    // 1. Check or create database
    try {
      await appwriteDb.get(APPWRITE_DATABASE_ID);
      console.log(`Appwrite database "${APPWRITE_DATABASE_ID}" verified.`);
    } catch (e: unknown) {
      const err = e as { code?: number; message?: string };
      if (err.code === 404) {
        console.log(`Creating Appwrite database "${APPWRITE_DATABASE_ID}"...`);
        await appwriteDb.create(APPWRITE_DATABASE_ID, 'zheal Database');
      } else {
        throw e;
      }
    }

    // 2. Check or create collection
    try {
      await appwriteDb.getCollection(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_ID);
      console.log(`Appwrite collection "${APPWRITE_COLLECTION_ID}" verified.`);
    } catch (e: unknown) {
      const err = e as { code?: number; message?: string };
      if (err.code === 404) {
        console.log(`Creating Appwrite collection "${APPWRITE_COLLECTION_ID}"...`);
        await appwriteDb.createCollection(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_ID,
          'Food Logs',
        );

        console.log('Creating Appwrite collection attributes...');
        await appwriteDb.createStringAttribute(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_ID,
          'name',
          255,
          true,
        );
        await appwriteDb.createStringAttribute(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_ID,
          'brand',
          255,
          true,
        );
        await appwriteDb.createStringAttribute(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_ID,
          'serving',
          100,
          true,
        );
        await appwriteDb.createFloatAttribute(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_ID,
          'calories',
          true,
        );
        await appwriteDb.createFloatAttribute(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_ID,
          'protein',
          true,
        );
        await appwriteDb.createFloatAttribute(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_ID,
          'carbs',
          true,
        );
        await appwriteDb.createFloatAttribute(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_ID,
          'fat',
          true,
        );
        await appwriteDb.createStringAttribute(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_ID,
          'timestamp',
          50,
          true,
        );

        console.log('Appwrite collection and attributes created successfully.');
      } else {
        throw e;
      }
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error during Appwrite setup, falling back to local memory storage:', errMsg);
    useLocalFallback = true;
  }
}

// Run setup in background
ensureAppwriteSetup().catch((err) => {
  const errMsg = err instanceof Error ? err.message : 'Unknown error';
  console.error('Appwrite background setup failed:', errMsg);
});

// Serve compiled app.js from the dist folder first, then search in public folder
app.get('/app.js', (req: Request, res: Response) => {
  const pathsToTry = [
    path.join(process.cwd(), 'dist/app.js'),
    path.join(__dirname, 'app.js'),
    path.join(__dirname, '../dist/app.js'),
    path.join(__dirname, '../public/app.js'),
  ];

  for (const p of pathsToTry) {
    if (fs.existsSync(p)) {
      res.sendFile(p);
      return;
    }
  }

  res.status(404).send('app.js not found. Run "pnpm run build" to compile typescript.');
});

// Serve static assets from the dist-frontend folder
app.use(express.static(path.join(__dirname, '../dist-frontend')));
// Search API Endpoint
app.get('/api/search', (req: Request, res: Response) => {
  const query = ((req.query.q as string) || '').trim().toLowerCase();

  if (!query) {
    res.json([]);
    return;
  }

  const filtered = indbProducts.filter((product) => {
    const name = (product.food_name || '').toLowerCase();
    const code = (product.food_code || '').toLowerCase();
    return name.includes(query) || code.includes(query);
  });

  res.json(filtered);
});

// Food Logs Endpoints
app.get('/api/logs', async (req: Request, res: Response) => {
  if (useLocalFallback || !appwriteDb) {
    res.json(localFoodLogs);
    return;
  }

  try {
    const response = await appwriteDb.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_ID);
    const logs = response.documents
      .map((doc) => ({
        id: doc.$id,
        name: doc.name as string,
        brand: doc.brand as string,
        serving: doc.serving as string,
        calories: doc.calories as number,
        protein: doc.protein as number,
        carbs: doc.carbs as number,
        fat: doc.fat as number,
        timestamp: doc.timestamp as string,
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    res.json(logs);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to list Appwrite documents:', errMsg);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

app.post('/api/logs', async (req: Request, res: Response) => {
  const { name, brand, serving, calories, protein, carbs, fat } = req.body;
  if (!name || !serving || calories === undefined) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const timestamp = new Date().toISOString();

  if (useLocalFallback || !appwriteDb) {
    const newLog: FoodLog = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      brand: brand || '',
      serving,
      calories: Number(calories),
      protein: Number(protein || 0),
      carbs: Number(carbs || 0),
      fat: Number(fat || 0),
      timestamp,
    };
    localFoodLogs.push(newLog);
    res.status(201).json(newLog);
    return;
  }

  try {
    const doc = await appwriteDb.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_COLLECTION_ID,
      ID.unique(),
      {
        name,
        brand: brand || '',
        serving,
        calories: Number(calories),
        protein: Number(protein || 0),
        carbs: Number(carbs || 0),
        fat: Number(fat || 0),
        timestamp,
      },
    );
    res.status(201).json({
      id: doc.$id,
      name: doc.name,
      brand: doc.brand,
      serving: doc.serving,
      calories: doc.calories,
      protein: doc.protein,
      carbs: doc.carbs,
      fat: doc.fat,
      timestamp: doc.timestamp,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to create Appwrite document:', errMsg);
    res.status(500).json({ error: 'Failed to save log' });
  }
});

app.delete('/api/logs', async (req: Request, res: Response) => {
  if (useLocalFallback || !appwriteDb) {
    localFoodLogs = [];
    res.json({ success: true });
    return;
  }

  try {
    const response = await appwriteDb.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_ID);
    const deletePromises = response.documents.map((doc) =>
      appwriteDb!.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_ID, doc.$id),
    );
    await Promise.all(deletePromises);
    res.json({ success: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to clear Appwrite collection:', errMsg);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

// Helper functions for CSV Parsing
function loadIndbCsv(): Record<string, string>[] {
  const csvPath = path.join(
    __dirname,
    '../Indian-Nutrient-Databank-INDB/csv_exports/indb_nutrient_data.csv',
  );

  if (!fs.existsSync(csvPath)) {
    console.warn(`Warning: CSV database file not found at ${csvPath}`);
    return [];
  }

  try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter((line) => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = splitCsvLine(lines[0]);
    const products: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = splitCsvLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index] ? values[index].trim() : '';
      });
      products.push(row);
    }

    return products;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error parsing INDB CSV:', errMsg);
    return [];
  }
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}/`);
});
