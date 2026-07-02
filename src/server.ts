import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 8080;

// Load and parse INDB CSV data on startup
const indbProducts = loadIndbCsv();
console.log(`Loaded ${indbProducts.length} items from Indian Nutrient Databank.`);

// Serve static assets from the public folder
app.use(express.static(path.join(__dirname, '../public')));

// Search API Endpoint
app.get('/api/search', (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim().toLowerCase();
  
  if (!query) {
    res.json([]);
    return;
  }

  const filtered = indbProducts.filter(product => {
    const name = (product.food_name || '').toLowerCase();
    const code = (product.food_code || '').toLowerCase();
    return name.includes(query) || code.includes(query);
  });

  res.json(filtered);
});

// Helper functions for CSV Parsing
function loadIndbCsv(): Record<string, string>[] {
  const csvPath = path.join(__dirname, '../Indian-Nutrient-Databank-INDB/csv_exports/indb_nutrient_data.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.warn(`Warning: CSV database file not found at ${csvPath}`);
    return [];
  }

  try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
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
    console.error('Error parsing INDB CSV:', error);
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
