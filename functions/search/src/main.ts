import * as fs from 'fs';
import * as path from 'path';

// Define the structure of the CSV product
interface NutrientProduct {
  food_name?: string;
  food_code?: string;
  [key: string]: string | undefined;
}

// In-memory cache of products
let cachedProducts: NutrientProduct[] | null = null;

// Helper function to parse a single CSV line handling quotes
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

// Load and parse the CSV database
function loadIndbCsv(log: (msg: string) => void, errorLog: (msg: string) => void): NutrientProduct[] {
  if (cachedProducts) {
    return cachedProducts;
  }

  // Check multiple potential paths for the CSV database file
  const pathsToTry = [
    path.join(__dirname, '../indb_nutrient_data.csv'),
    path.join(__dirname, 'indb_nutrient_data.csv'),
    path.join(__dirname, '../../../../Indian-Nutrient-Databank-INDB/csv_exports/indb_nutrient_data.csv'),
    path.join(process.cwd(), 'indb_nutrient_data.csv')
  ];

  let csvPath = '';
  for (const p of pathsToTry) {
    if (fs.existsSync(p)) {
      csvPath = p;
      break;
    }
  }

  if (!csvPath) {
    errorLog(`Warning: CSV database file not found in any expected location. Searched paths: ${pathsToTry.join(', ')}`);
    return [];
  }

  try {
    log(`Loading CSV database from: ${csvPath}`);
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = splitCsvLine(lines[0]);
    const products: NutrientProduct[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = splitCsvLine(lines[i]);
      const row: NutrientProduct = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index] ? values[index].trim() : '';
      });
      products.push(row);
    }

    cachedProducts = products;
    log(`Successfully loaded ${products.length} products from CSV.`);
    return products;
  } catch (err: any) {
    errorLog(`Error parsing CSV: ${err?.message || err}`);
    return [];
  }
}

// Appwrite Function Entrypoint
export default async ({ req, res, log, error }: {
  req: any;
  res: any;
  log: (message: any) => void;
  error: (message: any) => void;
}) => {
  // Only handle GET requests or requests checking search
  const query = ((req.query?.q || req.body?.q || '') as string).trim().toLowerCase();

  log(`Received search request with query: "${query}"`);

  const products = loadIndbCsv(log, error);

  if (!query) {
    return res.json([]);
  }

  const filtered = products.filter(product => {
    const name = (product.food_name || '').toLowerCase();
    const code = (product.food_code || '').toLowerCase();
    return name.includes(query) || code.includes(query);
  });

  log(`Found ${filtered.length} matches for query: "${query}"`);

  return res.json(filtered);
};
