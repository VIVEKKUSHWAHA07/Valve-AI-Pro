import { createClient } from '@supabase/supabase-js';
import * as xlsx from 'xlsx';
import * as fs from 'fs';

// Supabase Connection
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL and Key must be provided in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Normalization Logic
const BUILT_IN_RULES = [
  { search_term: "A105", replace_term: "carbon steel" },
  { search_term: "A216 WCB", replace_term: "carbon steel" },
  { search_term: "F316", replace_term: "stainless steel" },
  { search_term: "SS316", replace_term: "stainless steel" },
  { search_term: "SS304", replace_term: "stainless steel" },
  { search_term: "CF8M", replace_term: "stainless steel" },
  { search_term: "CF8", replace_term: "stainless steel" },
  { search_term: "CL150", replace_term: "class 150" },
  { search_term: "CL300", replace_term: "class 300" },
  { search_term: "CL600", replace_term: "class 600" },
  { search_term: "DN50", replace_term: "2 inch" },
  { search_term: "DN25", replace_term: "1 inch" },
  { search_term: "DN80", replace_term: "3 inch" },
  { search_term: "RF", replace_term: "raised face" },
  { search_term: "FF", replace_term: "flat face" }
];

function normalizeDescription(description: string) {
  if (!description) return "";
  let normalized = description.toLowerCase().replace(/\s+/g, ' ').trim();
  
  const sortedRules = [...BUILT_IN_RULES].sort((a, b) => b.search_term.length - a.search_term.length);

  for (const rule of sortedRules) {
    const escapedSearch = rule.search_term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedSearch}\\b`, 'gi');
    normalized = normalized.replace(regex, rule.replace_term);
  }
  return normalized;
}

// Code Generation Logic
const categoryCounters: Record<string, number> = {};

function generateCode(category: string) {
  const prefix = category.substring(0, 2).toUpperCase();
  if (!categoryCounters[category]) {
    categoryCounters[category] = 1;
  }
  const count = categoryCounters[category]++;
  return `${prefix}${count.toString().padStart(3, '0')}`;
}

async function processFile(filePath: string) {
  console.log(`Reading file: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const dataRows = xlsx.utils.sheet_to_json(worksheet) as any[];
  
  console.log(`Found ${dataRows.length} rows. Processing...`);

  const processedData = [];
  const seenDescriptions = new Set<string>();

  for (const row of dataRows) {
    const keys = Object.keys(row);
    const categoryKey = keys.find(k => k.toLowerCase().includes('category') || k.toLowerCase().includes('column_1'));
    const descKey = keys.find(k => k.toLowerCase().includes('description') || k.toLowerCase().includes('column_2'));
    const codeKey = keys.find(k => k.toLowerCase().includes('code') || k.toLowerCase().includes('column_3'));

    if (!categoryKey || !descKey) {
      continue;
    }

    const category = String(row[categoryKey] || '').trim();
    const description = String(row[descKey] || '').trim();
    let code = String(row[codeKey] || '').trim();

    if (!category || !description || description === '-') {
      continue;
    }

    const normalizedDesc = normalizeDescription(description);

    const uniqueKey = `${category}-${normalizedDesc}`;
    if (seenDescriptions.has(uniqueKey)) {
      continue;
    }
    seenDescriptions.add(uniqueKey);

    if (!code || code === '-' || code.length < 2) {
      code = generateCode(category);
    }

    processedData.push({
      category,
      description,
      code,
      description_normalized: normalizedDesc
    });
  }

  console.log(`Cleaned and normalized ${processedData.length} unique rows.`);

  const BATCH_SIZE = 100;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < processedData.length; i += BATCH_SIZE) {
    const batch = processedData.slice(i, i + BATCH_SIZE);
    
    try {
      const { error } = await supabase
        .from('product_catalogue')
        .upsert(batch, { onConflict: 'code', ignoreDuplicates: true });

      if (error) {
        console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, error.message);
        failCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(`Inserted batch ${i / BATCH_SIZE + 1} (${batch.length} rows)`);
      }
    } catch (err) {
      console.error(`Batch ${i / BATCH_SIZE + 1} exception:`, err);
      failCount += batch.length;
    }
  }

  console.log('\n--- FINAL OUTPUT ---');
  console.log(`Total rows inserted: ${successCount}`);
  console.log(`Failed rows: ${failCount}`);

  const { data: summary, error: summaryError } = await supabase
    .from('product_catalogue')
    .select('category', { count: 'exact' });

  if (summaryError) {
    console.error('Failed to fetch summary:', summaryError.message);
  } else if (summary) {
    const dist: Record<string, number> = {};
    summary.forEach(item => {
      dist[item.category] = (dist[item.category] || 0) + 1;
    });
    console.log('\nCategory Distribution:');
    console.table(dist);
  }
}

const filePath = process.argv[2];
if (filePath) {
  processFile(filePath);
} else {
  console.log('Usage: npx tsx load-catalogue.ts <path-to-excel-file>');
}
