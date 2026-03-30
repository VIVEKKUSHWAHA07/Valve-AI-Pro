import * as xlsx from 'xlsx';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialize Supabase client for backend to prevent crashes if .env is missing
let supabase: SupabaseClient | null = null;

function getSupabase() {
  if (!supabase) {
    const SUPABASE_URL = 'https://stqkpgkyvtmvvijilgmc.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0cWtwZ2t5dnRtdnZpamlsZ21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NjcyMzYsImV4cCI6MjA5MDI0MzIzNn0.92FxL9YuEwesIb1T-vowKqY1no58a0FKIGwBqlMu-uw';
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabase;
}

export interface ProcessedRow {
  valveType: string;
  size: string;
  class: string;
  standard: string;
  model: string;
  moc: string;
  trim: string;
  gasket: string;
  packing: string;
  operator: string;
  endDetail: string;
  bolting: string;
  originalRow: any;
  score: number;
  matchId?: string;
}

export interface Flag {
  row: number;
  field: string;
  message: string;
  type: 'warning' | 'critical';
}

export interface ProcessResult {
  total_rows: number;
  processed: number;
  not_manufactured: number;
  flags: Flag[];
  processed_rows: ProcessedRow[];
  download_url?: string;
}

export function processSingleRow(rowData: any, rowIndex: number = 1): { processedRow: ProcessedRow, flags: Flag[], isNotMfg: boolean } {
  const flags: Flag[] = [];
  const combinedDesc = `${rowData.desc} ${rowData.body} ${rowData.endType} ${rowData.construct}`.toUpperCase();

  // 1. Detect Valve Type
  let valveType = detectValveType(combinedDesc);
  let isNotMfg = false;

  if (['Butterfly Valve', 'Plug Valve', 'Strainer', 'Double Block & Bleed'].includes(valveType)) {
    isNotMfg = true;
  }

  // 2. Detect Size & Class
  let size = parseSize(rowData.size);
  let pressureClass = parseClass(rowData.rating);

  if (size && parseFloat(size) > 100) {
    flags.push({
      row: rowIndex,
      field: 'Size',
      message: '? Size could not be parsed — check RFQ column',
      type: 'critical'
    });
    size = null;
  }

  // 3. Resolve Sub-type (Ball/Check)
  if (valveType === 'Ball Valve') {
    valveType = resolveBallType(pressureClass || '', size || '');
  } else if (valveType === 'Check Valve') {
    valveType = resolveCheckType(size || '');
  }

  const processedRow: ProcessedRow = {
    valveType: isNotMfg ? valveType : valveType,
    size: formatSize(size),
    class: pressureClass ? `CLASS ${pressureClass}` : '',
    standard: '',
    model: '',
    moc: '',
    trim: '',
    gasket: '',
    packing: '',
    operator: '',
    endDetail: '',
    bolting: '',
    originalRow: rowData,
    score: 0
  };

  if (isNotMfg) {
    processedRow.gasket = `Not manufactured by XYZ Company - ${valveType}`;
    flags.push({
      row: rowIndex,
      field: 'Valve Type',
      message: 'Not manufactured',
      type: 'warning'
    });
  } else {
    // 4. Standard
    processedRow.standard = getStandard(valveType, size, pressureClass || '') || '';
    
    // 5. Model
    processedRow.model = getModel(valveType, size || '', pressureClass || '', rowData.endType);
    
    // 6. MOC
    const mocResult = getMOC(rowData.body);
    processedRow.moc = mocResult.resolved || 'Unknown';
    if (mocResult.flag) {
      flags.push({
        row: rowIndex,
        field: 'MOC',
        message: mocResult.flag,
        type: 'warning'
      });
    }
    if (mocResult.cast && size && parseFloat(size) < 2) {
      flags.push({
        row: rowIndex,
        field: 'MOC',
        message: 'Cast MOC not allowed for size < 2"',
        type: 'critical'
      });
    }

    // 7. Trim
    const trimResult = getTrim(valveType, size, rowData.trim, rowData.body);
    processedRow.trim = trimResult || '';
    if (!trimResult && !valveType.includes('Ball') && !isNotMfg) {
      flags.push({
        row: rowIndex,
        field: 'Trim',
        message: 'Trim not recognised',
        type: 'warning'
      });
    }

    // 8. Gasket
    processedRow.gasket = getGasket(valveType);

    // 9. Packing
    processedRow.packing = getPacking(valveType, processedRow.standard);

    // 10. Operator
    processedRow.operator = getOperator(valveType, size, pressureClass || '') || '';

    // 11. End Detail
    processedRow.endDetail = getEndDetail(rowData.endType, combinedDesc);

    // 12. Bolting
    processedRow.bolting = getBolting(processedRow.moc) || 'Standard Bolting';

    // Mock Supabase Matching
    const matchScore = calculateScore(processedRow);
    processedRow.score = matchScore;

    if (matchScore < 70) {
      flags.push({
        row: rowIndex,
        field: 'Match',
        message: 'No catalogue match found',
        type: 'warning'
      });
    } else {
      processedRow.matchId = `CAT-${Math.floor(Math.random() * 10000)}`;
    }
  }

  return { processedRow, flags, isNotMfg };
}

export async function processRFQ(fileBuffer: Buffer, userId?: string, filename?: string): Promise<ProcessResult> {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { 
    header: 1,      // gives array of arrays
    defval: '',     // empty cells = '' not undefined
    raw: false      // all values as strings
  }) as any[][];

  if (data.length < 2) {
    throw new Error('Excel file is empty or missing headers');
  }

  // Use exact indices as specified in the prompt
  const colMap = {
    item: 0,
    desc: 1, // Assuming description is at index 1
    spec: 2,
    rating: 3, // Assuming rating is at index 3
    body: 4, // MOC must be read ONLY from RFQ Body/MOC col (index 4)
    trim: 7, // Trim must be read ONLY from RFQ Trim col (index 7)
    construct: 8,
    endType: 9,
    size: 11, // Size must come from RFQ col index 11 (0-indexed)
    qty: 12
  };

  const result: ProcessResult = {
    total_rows: data.length - 1,
    processed: 0,
    not_manufactured: 0,
    flags: [],
    processed_rows: []
  };

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Skip completely empty rows
    if (!row || row.length === 0 || row.every(cell => !cell || String(cell).trim() === '')) continue;

    const rowData = {
      item: colMap.item >= 0 ? row[colMap.item] : '',
      desc: colMap.desc >= 0 ? String(row[colMap.desc] || '') : '',
      spec: colMap.spec >= 0 ? String(row[colMap.spec] || '') : '',
      rating: colMap.rating >= 0 ? String(row[colMap.rating] || '') : '',
      body: colMap.body >= 0 ? String(row[colMap.body] || '') : '',
      trim: colMap.trim >= 0 ? String(row[colMap.trim] || '') : '',
      construct: colMap.construct >= 0 ? String(row[colMap.construct] || '') : '',
      endType: colMap.endType >= 0 ? String(row[colMap.endType] || '') : '',
      size: colMap.size >= 0 ? String(row[colMap.size] || '') : '',
      qty: colMap.qty >= 0 ? row[colMap.qty] : ''
    };

    const { processedRow, flags, isNotMfg } = processSingleRow(rowData, i + 1);

    if (isNotMfg) {
      result.not_manufactured++;
    }

    result.flags.push(...flags);
    result.processed_rows.push(processedRow);
    result.processed++;
  }

  // Generate output Excel
  const outData = result.processed_rows.map(r => ({
    ValveType: r.valveType,
    Size: r.size,
    Class: r.class,
    Standard: r.standard,
    Model: r.model,
    MOC: r.moc,
    Trim: r.trim,
    Gasket: r.gasket,
    Packing: r.packing,
    Operator: r.operator,
    EndDetail: r.endDetail,
    Bolting: r.bolting
  }));

  const outSheet = xlsx.utils.json_to_sheet(outData);
  const outWorkbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(outWorkbook, outSheet, 'Working Sheet');
  
  // Convert to base64 for download
  const outBuffer = xlsx.write(outWorkbook, { type: 'base64', bookType: 'xlsx' });
  result.download_url = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${outBuffer}`;

  // Save to processing_history if userId is provided
  if (userId && filename) {
    const sb = getSupabase();
    if (sb) {
      try {
        await sb.from('processing_history').insert({
          user_id: userId,
          filename: filename,
          total_rows: result.total_rows,
          processed_rows: result.processed,
          not_manufactured_count: result.not_manufactured,
          flags_count: result.flags.length,
          status: result.flags.length > 0 ? 'Review Needed' : 'Completed'
        });
      } catch (err) {
        console.error('Failed to save processing history to Supabase:', err);
      }
    }
  }

  return result;
}

export function generateTrace(desc: string): string[] {
  const trace: string[] = [];
  
  trace.push(`> Step 1 — Input received: "${desc}"`);
  
  // Create a mock rowData from the description
  const rowData = { desc, rating: '', size: '', body: '', trim: '', endType: '', construct: '' };
  
  // Try to extract size and rating from description for the trace
  const sizeMatch = desc.match(/(\d+(?:-\d+\/\d+)?|\d+\/\d+)"?/);
  if (sizeMatch) rowData.size = sizeMatch[1];
  
  const classMatch = desc.match(/(?:CLASS|CL|#|LB)?\s*(150|300|600|800|900|1500|2500)/i);
  if (classMatch) rowData.rating = classMatch[1];
  
  const { processedRow } = processSingleRow(rowData);
  
  trace.push(`> Step 2 — Valve type detected: "${processedRow.valveType}"`);
  trace.push(`> Step 3 — Size detected: ${processedRow.size ? `"${processedRow.size}"` : 'Not found'}`);
  trace.push(`> Step 4 — Class detected: ${processedRow.class ? `"${processedRow.class}"` : 'Not found'}`);
  trace.push(`> Step 5 — Standard resolved: ${processedRow.standard ? `"${processedRow.standard}"` : 'Not found'}`);
  trace.push(`> Step 6 — Model resolved: ${processedRow.model ? `"${processedRow.model}"` : 'Not found'}`);
  trace.push(`> Step 7 — MOC resolved: ${processedRow.moc ? `"${processedRow.moc}"` : 'Not found'}`);
  trace.push(`> Step 8 — Trim resolved: ${processedRow.trim ? `"${processedRow.trim}"` : 'Not found'}`);
  trace.push(`> Step 9 — Operator resolved: ${processedRow.operator ? `"${processedRow.operator}"` : 'Not found'}`);
  trace.push(`> Step 10 — Bolting resolved: ${processedRow.bolting ? `"${processedRow.bolting}"` : 'Not found'}`);
  
  trace.push(`... trace completed successfully.`);
  
  return trace;
}

export function generateFuzzyMatches(desc: string): any[] {
  const { processedRow } = processSingleRow({ desc, rating: '', size: '', body: '', trim: '', endType: '', construct: '' });
  
  // Generate some mock matches based on the parsed data
  const matches = [
    {
      score: processedRow.score + 40,
      type: processedRow.valveType,
      size: processedRow.size || 'Unknown',
      class: processedRow.class || 'Unknown',
      moc: processedRow.moc || 'Unknown',
      trim: processedRow.trim || 'Unknown',
      pass: (processedRow.score + 40) >= 70
    },
    {
      score: processedRow.score + 10,
      type: processedRow.valveType,
      size: processedRow.size || 'Unknown',
      class: processedRow.class || 'Unknown',
      moc: 'Alternative MOC',
      trim: processedRow.trim || 'Unknown',
      pass: (processedRow.score + 10) >= 70
    },
    {
      score: Math.max(0, processedRow.score - 20),
      type: 'Different Valve',
      size: processedRow.size || 'Unknown',
      class: processedRow.class || 'Unknown',
      moc: processedRow.moc || 'Unknown',
      trim: 'Different Trim',
      pass: Math.max(0, processedRow.score - 20) >= 70
    }
  ];
  
  return matches.sort((a, b) => b.score - a.score);
}

// --- Deterministic Rule Functions ---

function detectValveType(desc: string): string {
  if (/(GTV|GT\.V|G\/V|G\.V|GTW|GATE VALVE|WEDGE|SLAB GATE)/.test(desc)) return 'Gate Valve';
  if (/(GLV|GL\.V|GL\/V|GBV|GLOBE VALVE)/.test(desc)) return 'Globe Valve';
  if (/(BV|B\/V|BLV|BALL VALVE)/.test(desc)) return 'Ball Valve';
  if (/(CHK|C\/V|NRV|CHECK VALVE|NON RETURN|SWING CHECK|LIFT CHECK)/.test(desc)) return 'Check Valve';
  if (/(BFV|BTF|B\/FLY|BUTTERFLY)/.test(desc)) return 'Butterfly Valve';
  if (/(PLV|PLUG VALVE)/.test(desc)) return 'Plug Valve';
  if (/(STR|Y-TYPE|STRAINER)/.test(desc)) return 'Strainer';
  if (/(DBB|DOUBLE BLOCK)/.test(desc)) return 'Double Block & Bleed';
  return 'Unknown Valve';
}

function parseSize(str: string): string | null {
  if (!str || str === '' || str === 'undefined') return null;
  
  // Fraction map — must handle these BEFORE trying parseFloat
  const fractionMap: Record<string, number> = {
    '1/4': 0.25, '3/8': 0.375, '1/2': 0.5, '3/4': 0.75,
    '1-1/4': 1.25, '1-1/2': 1.5, '1-3/4': 1.75, '2-1/2': 2.5,
    '3-1/2': 3.5, '4-1/2': 4.5
  };
  
  // Strip inch symbol and whitespace
  const clean = str.replace(/"/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  
  // Check fraction map first
  for (const [frac, val] of Object.entries(fractionMap)) {
    if (clean === frac) return val.toString();
  }
  
  // Try plain number
  const num = parseFloat(clean);
  if (!isNaN(num) && num > 0 && num <= 100) return num.toString(); // 100" max real valve size
  
  return null; // Could not parse — flag this row
}

function formatSize(numericSize: string | null): string {
  if (!numericSize) return '';
  const num = parseFloat(numericSize);
  // Reverse fraction map for display
  const reverseMap: Record<number, string> = {
    0.25: '1/4"', 0.375: '3/8"', 0.5: '1/2"', 0.75: '3/4"',
    1.25: '1-1/4"', 1.5: '1-1/2"', 1.75: '1-3/4"', 2.5: '2-1/2"',
    3.5: '3-1/2"', 4.5: '4-1/2"'
  };
  return reverseMap[num] || `${numericSize}"`;
}

function parseClass(str: string): string {
  if (!str) return '';
  const match = str.match(/(?:CLASS|CL|#|LB)?\s*(150|300|600|800|900|1500|2500)/i);
  return match ? match[1] : '';
}

function resolveBallType(cls: string, size: string): string {
  const s = parseFloat(size);
  if (cls === '150') return s <= 8 ? 'Floating Ball Valve' : 'Trunnion Mounted Ball Valve';
  if (cls === '300') return s <= 4 ? 'Floating Ball Valve' : 'Trunnion Mounted Ball Valve';
  if (['600', '800', '900', '1500', '2500'].includes(cls)) return s <= 1.5 ? 'Floating Ball Valve' : 'Trunnion Mounted Ball Valve';
  return 'Ball Valve';
}

function resolveCheckType(size: string): string {
  const s = parseFloat(size);
  return s < 2 ? 'Lift Check Valve - Piston Type' : 'Check Valve - Swing Type';
}

function getStandard(valveType: string, size: string | null, classNumStr: string): string | null {
  const type = (valveType || '').toLowerCase();
  const s = size ? parseFloat(size) : null;
  const classNum = classNumStr ? parseInt(classNumStr) : null;

  // Size < 2" overrides everything (except special cases below)
  if (s !== null && s < 2) {
    if (type.includes('lift check') || type.includes('piston')) return 'ISO 15761';
    if (type.includes('ball')) return 'ISO 17292';
    return 'API 602 - Reduce Bore (STD.Bore)';
  }
  
  // Large valve override ≥ 26"
  if (s !== null && s >= 26) return 'ASME B16.34';
  
  // High pressure class override (≥ 2")
  if (classNum !== null && [900, 1500, 2500].includes(classNum)) return 'ASME B16.34';
  
  // Dual plate check — always API 594
  if (type.includes('dual plate')) return 'API 594 - Type B';
  
  // Lift check (always < 2" anyway, but safety net)
  if (type.includes('lift check') || type.includes('piston')) return 'ISO 15761';
  
  // Normal range: 2" to 25.99", class 150/300/600/800
  if (type.includes('trunnion')) return 'API 6D';
  if (type.includes('floating')) return 'ISO 17292';
  if (type.includes('ball')) return 'API 6D';
  if (type.includes('gate')) return 'API 600';
  if (type.includes('globe')) return 'BS 1873';
  if (type.includes('check') || type.includes('swing')) return 'BS 1868';
  
  return null; // Unknown — flag
}

function getModel(type: string, size: string, cls: string, end: string): string {
  const s = parseFloat(size);
  if (type.includes('Ball')) {
    if (cls === '800') return '3 Piece, Bolted, Side Entry - MFR Std';
    return '2 Piece, Bolted, Side Entry - Long pattern';
  }
  if (['150', '300', '600'].includes(cls)) return 'Bolted - Long pattern';
  if (['900', '1500', '2500'].includes(cls)) {
    if (s >= 2) {
      if (/(FLG|RTJ)/i.test(end)) return 'Pressure Seal - Long Pattern';
      return 'Pressure Seal - Short Pattern';
    }
    return 'Bolted - Mfg. Std.';
  }
  if (cls === '800') return 'Bolted - Mfg. Std.';
  return '';
}

const MOC_MAP: Record<string, { resolved: string, cast: boolean }> = {
  // Cast types — flag if size < 2"
  'WCB': { resolved: 'ASTM A216 Gr.WCB', cast: true },
  'A216 WCB': { resolved: 'ASTM A216 Gr.WCB', cast: true },
  'WCC': { resolved: 'ASTM A216 Gr.WCC', cast: true },
  'A216 WCC': { resolved: 'ASTM A216 Gr.WCC', cast: true },
  'LCB': { resolved: 'ASTM A352 Gr.LCB', cast: true },
  'A352 LCB': { resolved: 'ASTM A352 Gr.LCB', cast: true },
  'CF8M': { resolved: 'ASTM A351 Gr.CF8M', cast: true },
  'A351 CF8M': { resolved: 'ASTM A351 Gr.CF8M', cast: true },
  // Forged types
  'A105': { resolved: 'ASTM A105', cast: false },
  'A105N': { resolved: 'ASTM A105N', cast: false },
  'ASTM A105': { resolved: 'ASTM A105', cast: false },
  'F316': { resolved: 'ASTM A182 Gr.F316', cast: false },
  'SS316': { resolved: 'ASTM A182 Gr.F316', cast: false },
  '316 SS': { resolved: 'ASTM A182 Gr.F316', cast: false },
  'A182 F316': { resolved: 'ASTM A182 Gr.F316', cast: false },
  'F304': { resolved: 'ASTM A182 Gr.F304', cast: false },
  'SS304': { resolved: 'ASTM A182 Gr.F304', cast: false },
  'F316L': { resolved: 'ASTM A182 Gr.F316L', cast: false },
  'F304L': { resolved: 'ASTM A182 Gr.F304L', cast: false },
  'LF2': { resolved: 'ASTM A350 Gr.LF2 CL.1', cast: false },
  'A350 LF2': { resolved: 'ASTM A350 Gr.LF2 CL.1', cast: false },
  'F44': { resolved: 'ASTM A182 Gr.F44', cast: false },
  'CK3MCUN': { resolved: 'ASTM A182 Gr.F44', cast: false },
  '254SMO': { resolved: 'ASTM A182 Gr.F44', cast: false },
  '6MO': { resolved: 'ASTM A182 Gr.F44', cast: false },
  'F51': { resolved: 'ASTM A182 Gr.F51', cast: false },
  '2205': { resolved: 'ASTM A182 Gr.F51', cast: false },
  'DUPLEX': { resolved: 'ASTM A182 Gr.F51', cast: false },
  'F53': { resolved: 'ASTM A182 Gr.F53', cast: false },
  'SUPER DUPLEX': { resolved: 'ASTM A182 Gr.F53', cast: false },
  '2507': { resolved: 'ASTM A182 Gr.F53', cast: false },
  'HASTELLOY': { resolved: 'ASTM B574 Gr.N10276', cast: false },
  'C276': { resolved: 'ASTM B574 Gr.N10276', cast: false },
  'HASTELLOY C276': { resolved: 'ASTM B574 Gr.N10276', cast: false },
  'INCONEL 625': { resolved: 'ASTM B446 Gr.625', cast: false },
  'ALLOY 625': { resolved: 'ASTM B446 Gr.625', cast: false },
  'MONEL': { resolved: 'ASTM B164 Gr.N04400', cast: false },
  'MONEL 400': { resolved: 'ASTM B164 Gr.N04400', cast: false },
  'AL-BRONZE': { resolved: 'ASTM B62 (Bronze)', cast: false },
  'AL-BR': { resolved: 'ASTM B62 (Bronze)', cast: false },
  'B62': { resolved: 'ASTM B62 (Bronze)', cast: false },
};

function getMOC(raw: string): { resolved: string | null, cast: boolean, flag?: string } {
  let upper = raw.toUpperCase().trim();
  
  const findMatch = (text: string) => {
    if (!text) return null;
    // Direct lookup first
    if (MOC_MAP[text]) return MOC_MAP[text];
    // Partial match — check if text contains any key
    for (const [key, val] of Object.entries(MOC_MAP)) {
      if (text.includes(key)) return val;
    }
    return null;
  };

  let match = findMatch(upper);
  if (match) return match;

  // Not found — return yellow flag
  return { resolved: null, cast: false, flag: `MOC not recognised: "${raw}"` };
}

function getTrim(valveType: string, size: string | null, trimRaw: string, mocRaw: string): string | null {
  // Trim only applies to Gate, Globe, Check valves
  const trimApplies = ['gate', 'globe', 'check', 'swing', 'lift', 'dual plate', 'piston'];
  const typeL = (valveType || '').toLowerCase();
  if (!trimApplies.some(t => typeL.includes(t))) return null; // Ball valves = no trim
  
  let raw = String(trimRaw || '').trim().toUpperCase();
  if (!raw || raw === '') {
    // Fallback to MOC-based trim only if trim col is empty
    raw = String(mocRaw || '').trim().toUpperCase();
  }
  
  const s = size ? parseFloat(size) : 0;
  const noStellite = /W\/?O\s*STELLITE|WITHOUT\s*STELLITE|NO\s*STELLITE|NON.STELLITE|PLAIN\s*TRIM|PLAIN\s*SEAT|W\/?O\s*HARDFACING/i.test(raw);
  const col = s < 2 ? 'ssw' : (noStellite ? 'wo' : 'ss');
  
  const TRIM_TABLE: any[] = [
    { keys: ['TRIM 8', 'F6', '13CR', '410'],
      wo: 'F6 / F6 - T1', ss: 'F6 & Hardfaced - T8', ssw: 'Hardfaced (410) - T5' },
    { keys: ['TRIM 12', '316', 'CF8M', 'F316'],
      wo: '316 - T10', ss: '316 and Hardfaced - T12', ssw: 'Hardfaced (316) - T16' },
    { keys: ['304', 'F304'],
      wo: '304 - T2', ss: '304 and Hardfaced - T51', ssw: 'Hardfaced (304) - T15' },
    { keys: ['316L', 'F316L'],
      wo: '316L - T55', ss: '316L and Hardfaced - T56', ssw: 'Hardfaced (316L) - T57' },
    { keys: ['F51', '2205', 'DUPLEX'],
      wo: 'F51 - T79', ss: 'F51 and Hardfaced - T81', ssw: 'Hardfaced (F51) - T82' },
    { keys: ['F53', 'SUPER DUPLEX', '2507'],
      wo: 'F53 - T70', ss: 'F53 and Hardfaced - T71', ssw: 'Hardfaced (F53) - T72' },
    { keys: ['F44', 'CK3MCUN', '254SMO'],
      wo: 'F44 - T97', ss: 'F44 & Hardfaced', ssw: 'Hardfaced (F44)' },
    { keys: ['HASTELLOY', 'C276'],
      wo: 'Hastelloy C276 - T45', ss: 'Hastelloy C276 & Hardfaced - T46', ssw: 'Hardfaced (Hastelloy C276) - T47' },
    { keys: ['INCONEL 625', 'ALLOY 625'],
      wo: 'Inconel 625 - T90', ss: 'Inconel 625 & Hardfaced - T9D', ssw: 'Hardfaced (625) - T98' },
    { keys: ['MONEL'],
      wo: 'Monel - T9', ss: 'Monel and Hardfaced - T11', ssw: 'Hardfaced (Monel)' },
    { keys: ['LF2', 'LCB'],
      wo: null, ss: 'LF2/LCB & Hardfaced', ssw: 'Hardfaced (LF2/LCB)' },
    { keys: ['A105', 'WCB'],
      wo: null, ss: 'F6 & Hardfaced - T8', ssw: 'Hardfaced (410) - T5' },
  ];
  
  for (const entry of TRIM_TABLE) {
    if (entry.keys.some((k: string) => raw.includes(k))) {
      return entry[col] || entry['ss'] || entry['ssw'];
    }
  }
  return null; // Flag as unrecognised trim
}

function getGasket(type: string): string {
  if (type.includes('Ball')) return 'Graphite';
  return 'Spiral Wound Gasket SS316 with Graphite filler';
}

function getPacking(type: string, std: string): string {
  if (type.includes('Check')) return '';
  if (type.includes('Ball')) return 'Graphite';
  if (std.includes('API')) return 'Die moulded Graphite compliance to API 622';
  return 'Die moulded Graphite';
}

function getOperator(valveType: string, size: string | null, classNumStr: string): string | null {
  const type = (valveType || '').toLowerCase();
  const s = size ? parseFloat(size) : null;
  const classNum = classNumStr ? parseInt(classNumStr) : null;
  
  if (type.includes('check')) return ''; // Always blank
  if (s === null || classNum === null) return null;
  
  const thresholds: Record<string, Record<number, number | null>> = {
    gate: { 150: 12, 300: 12, 600: 10, 800: null, 900: 6, 1500: 3, 2500: 3 },
    globe: { 150: 12, 300: 12, 600: 10, 800: null, 900: 6, 1500: 3, 2500: 3 },
    ball: { 150: 6, 300: 6, 600: 4, 800: 3, 900: 3, 1500: 3, 2500: 3 },
  };
  
  const isGate = type.includes('gate');
  const isGlobe = type.includes('globe');
  const isBall = type.includes('ball') || type.includes('trunnion') || type.includes('floating');
  
  const category = isGate ? 'gate' : isGlobe ? 'globe' : isBall ? 'ball' : null;
  if (!category) return null;
  
  const threshold = thresholds[category]?.[classNum];
  
  // CLASS 800 gate/globe = always hand wheel
  if ((isGate || isGlobe) && classNum === 800) return 'Hand Wheel';
  
  if (threshold !== null && threshold !== undefined && s >= threshold) return 'Gear Unit; Locking arrangement';
  return isBall ? 'Lever' : 'Hand Wheel';
}

function getEndDetail(end: string, desc: string): string {
  const e = `${end} ${desc}`.toUpperCase();
  if (/(RTJ)/.test(e)) return 'ASME B16.5 FE - RTJ';
  if (/(THD|NPT|SCREWED)/.test(e)) return 'SE - NPT(F)';
  if (/(SW|SOCKET WELD)/.test(e)) return 'SWE - CL3000';
  if (/(BW|BUTT WELD)/.test(e)) return 'ASME B16.25 BWE';
  return 'ASME B16.5 FERF / 125 - 250';
}

function getBolting(resolvedMOC: string | null): string | null {
  if (!resolvedMOC) return null;
  const m = resolvedMOC.toUpperCase();
  
  if (m.includes('WCB') || m.includes('WCC') || m.includes('A105') || m.includes('BRONZE') || m.includes('B62'))
    return 'ASTM A193 Gr.B7 / ASTM A194 Gr.2H';
  if (m.includes('LF2') || m.includes('LCB'))
    return 'ASTM A320 Gr.L7 / ASTM A194 Gr.7';
  if (m.includes('F316') || m.includes('CF8M') || m.includes('F304'))
    return 'ASTM A193 Gr.B8 CL.1 / ASTM A194 Gr.8';
  if (m.includes('F44') || m.includes('CK3MCU'))
    return 'ASTM A193 Gr.B16 / ASTM A194 Gr.7';
  if (m.includes('F51') || m.includes('F53') || m.includes('F55'))
    return 'ASTM A193 Gr.B8M CL.2 / ASTM A194 Gr.8M';
  if (m.includes('HASTELLOY') || m.includes('INCONEL') || m.includes('MONEL'))
    return 'ASTM A193 Gr.B8 CL.2 / ASTM A194 Gr.8';
  
  return null;
}

function calculateScore(row: ProcessedRow): number {
  let score = 0;
  if (row.valveType && row.valveType !== 'Unknown Valve') score += 50;
  if (row.size) score += 30;
  if (row.class) score += 30;
  if (row.endDetail) score += 10;
  if (row.moc && row.moc !== 'Unknown') score += 10;
  if (row.trim) score += 10;
  return Math.min(score, 100);
}
