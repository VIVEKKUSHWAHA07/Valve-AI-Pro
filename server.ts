import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import multer from "multer";
import * as xlsx from "xlsx";
import { processCatalogueUpload } from "./src/lib/catalogue-loader";

const SUPABASE_URL = "https://stqkpgkyvtmvvijilgmc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0cWtwZ2t5dnRtdnZpamlsZ21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NjcyMzYsImV4cCI6MjA5MDI0MzIzNn0.92FxL9YuEwesIb1T-vowKqY1no58a0FKIGwBqlMu-uw";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const upload = multer({ storage: multer.memoryStorage() });

// Rule engine to normalize RFQ input based on rules table
export function applyRules(description: string, rules: any[]) {
  let normalized = description;
  
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

  const allRules = [...BUILT_IN_RULES, ...rules];

  // Sort rules by length of search term descending to match longer phrases first
  const sortedRules = allRules.sort((a, b) => {
    const searchA = a.search_term || a.pattern || a.if_condition || a.source || "";
    const searchB = b.search_term || b.pattern || b.if_condition || b.source || "";
    return searchB.length - searchA.length;
  });

  for (const rule of sortedRules) {
    // Support various common column names for rules
    const search = rule.search_term || rule.pattern || rule.if_condition || rule.source;
    const replace = rule.replace_term || rule.replacement || rule.then_action || rule.target;
    
    if (search && replace !== undefined) {
      try {
        // Use word boundaries to prevent partial matches (e.g., replacing "CS" inside "MACS")
        // Escape special regex characters in the search term
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedSearch}\\b`, 'gi');
        normalized = normalized.replace(regex, replace);
      } catch (e) {
        // Fallback if regex fails
        normalized = normalized.split(search).join(replace);
      }
    }
  }
  return normalized;
}

// Category Detection
export function detectCategory(normalizedText: string): string | null {
  const text = normalizedText.toLowerCase();
  
  if (text.includes("ball valve") || text.includes("gate valve") || text.includes("globe valve") || text.includes("butterfly valve") || text.includes("check valve")) {
    return "ValveType";
  }
  
  if (text.includes("gasket") || text.includes("o ring")) {
    return "Gasket";
  }
  
  if (text.includes("packing") || text.includes("stem packing")) {
    return "Packing";
  }
  
  if (text.includes("trim")) {
    return "Trim";
  }
  
  return null;
}

// Attribute Extraction
function extractAttributes(text: string) {
  const attrs = {
    size: null as string | null,
    material: null as string | null,
    pressure: null as string | null
  };

  // Size: 2", 2 inch, 2in, DN50, 50mm, 1/2", 1.5"
  const sizeMatch = text.match(/(?:^|\b)(\d+(?:\.\d+)?|\d+\/\d+)\s*(inch|"|in|mm)(?=[^\w]|$)|(?:^|\b)dn\s*(\d+)\b/i);
  if (sizeMatch) {
    if (sizeMatch[3]) {
      const dn = parseInt(sizeMatch[3], 10);
      if (dn === 25) attrs.size = "1 inch";
      else if (dn === 50) attrs.size = "2 inch";
      else if (dn === 80) attrs.size = "3 inch";
      else attrs.size = `dn${dn}`;
    } else {
      attrs.size = `${sizeMatch[1]} inch`;
    }
  }

  // Pressure: Class 150, 150#, PN16, 300lb
  const pressureMatch = text.match(/(?:^|\b)(class\s*\d+|\d+\s*(?:#|lb|psi)|pn\s*\d+)(?=[^\w]|$)/i);
  if (pressureMatch) {
    let p = pressureMatch[1].toLowerCase();
    if (p.startsWith('class')) {
      attrs.pressure = p.replace(/\s+/, ' ');
    } else if (p.endsWith('#') || p.endsWith('lb') || p.endsWith('psi')) {
      const num = p.replace(/\D/g, '');
      attrs.pressure = `class ${num}`;
    } else {
      attrs.pressure = p.replace(/\s+/g, '');
    }
  }

  // Material: Stainless Steel, Carbon Steel, SS316, Brass, Bronze, Cast Iron, PVC
  const materialMatch = text.match(/\b(?:stainless steel|carbon steel|brass|bronze|cast iron|ductile iron|pvc|cpvc|alloy)\b/i);
  if (materialMatch) {
    attrs.material = materialMatch[0].toLowerCase().replace(/\s+/g, ' ');
  }

  return attrs;
}

// Deterministic matching function with structured scoring
export function matchRfq(rfqDescription: string, catalogue: any[]) {
  const rfqTokens = rfqDescription.toLowerCase().split(/\W+/).filter(t => t.length > 0);
  const rfqAttrs = extractAttributes(rfqDescription);
  
  let bestMatch = null;
  let highestScore = 0;
  let bestMatchDetails = null;

  let bestTokenMatch = null;
  let highestTokenScore = 0;
  let bestTokenDetails = null;

  for (const product of catalogue) {
    const descNormalized = (product.description_normalized || product.description || "").toLowerCase();
    const productTokens = descNormalized.split(/\W+/).filter((t: string) => t.length > 0);
    
    // Extract product attributes (fallback to description if explicit fields are missing)
    const prodAttrs = {
      size: product.size ? extractAttributes(String(product.size)).size || String(product.size).toLowerCase().replace(/[\s"]/g, '').replace('inch', 'in') : extractAttributes(descNormalized).size,
      material: product.material ? extractAttributes(String(product.material)).material || String(product.material).toLowerCase() : extractAttributes(descNormalized).material,
      pressure: product.pressure || product.pressure_class ? extractAttributes(String(product.pressure || product.pressure_class)).pressure || String(product.pressure || product.pressure_class).toLowerCase().replace(/\s+/g, '') : extractAttributes(descNormalized).pressure
    };
    
    // Calculate token intersection score
    let matchCount = 0;
    for (const token of rfqTokens) {
      if (productTokens.includes(token)) matchCount++;
    }
    const tokenScore = matchCount / Math.max(rfqTokens.length, productTokens.length, 1);
    
    // Weighted Scoring System
    let totalWeight = 20; // Base weight for token match
    let earnedScore = tokenScore * 20;
    
    const details = { tokenScore, sizeMatch: false, materialMatch: false, pressureMatch: false };

    // Size Scoring (Weight: 35)
    if (rfqAttrs.size) {
      totalWeight += 35;
      if (prodAttrs.size === rfqAttrs.size) {
        earnedScore += 35;
        details.sizeMatch = true;
      }
    }

    // Material Scoring (Weight: 30)
    if (rfqAttrs.material) {
      totalWeight += 30;
      if (prodAttrs.material === rfqAttrs.material) {
        earnedScore += 30;
        details.materialMatch = true;
      }
    }

    // Pressure Scoring (Weight: 15)
    if (rfqAttrs.pressure) {
      totalWeight += 15;
      if (prodAttrs.pressure === rfqAttrs.pressure) {
        earnedScore += 15;
        details.pressureMatch = true;
      }
    }
    
    const finalScore = earnedScore / totalWeight;
    
    if (finalScore > highestScore) {
      highestScore = finalScore;
      bestMatch = product;
      bestMatchDetails = details;
    }

    if (tokenScore > highestTokenScore) {
      highestTokenScore = tokenScore;
      bestTokenMatch = product;
      bestTokenDetails = details;
    }
  }

  // Fallback matching if no strong match found
  if (highestScore < 0.2 && bestTokenMatch && highestTokenScore > 0) {
    bestMatch = bestTokenMatch;
    highestScore = highestTokenScore;
    bestMatchDetails = bestTokenDetails;
  }

  return { bestMatch, score: highestScore, rfqAttrs, matchDetails: bestMatchDetails };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/catalogue/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const result = await processCatalogueUpload(req.file.buffer);
      res.json(result);
    } catch (error: any) {
      console.error("Catalogue upload error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/jobs/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Read Excel file
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(worksheet) as any[];

      if (rows.length === 0) {
        return res.status(400).json({ error: "Excel file is empty" });
      }

      // Find the description column (case-insensitive)
      const firstRow = rows[0];
      const descKey = Object.keys(firstRow).find(k => k.toLowerCase().includes("description") || k.toLowerCase().includes("rfq")) || Object.keys(firstRow)[0];

      // Fetch catalogue and rules
      const { data: catalogue, error: catalogueError } = await supabase.from("product_catalogue").select("*");
      if (catalogueError) throw new Error(`Failed to fetch catalogue: ${catalogueError.message}`);

      const { data: rules, error: rulesError } = await supabase.from("rules").select("*");
      if (rulesError) throw new Error(`Failed to fetch rules: ${rulesError.message}`);

      // Process rows
      const processedRows = rows.map(row => {
        const description = String(row[descKey] || "");
        const normalizedDescription = applyRules(description, rules || []);
        
        const detectedCategory = detectCategory(normalizedDescription);
        let filteredCatalogue = catalogue || [];
        if (detectedCategory) {
          filteredCatalogue = filteredCatalogue.filter(item => item.category === detectedCategory);
        }
        
        const { bestMatch, score, rfqAttrs, matchDetails } = matchRfq(normalizedDescription, filteredCatalogue);

        return {
          ...row,
          matched_code: bestMatch ? bestMatch.id : null,
          score: score,
          detected_category: detectedCategory,
          debug_normalized_input: normalizedDescription,
          debug_extracted_attributes: JSON.stringify(rfqAttrs),
          debug_token_score: matchDetails ? matchDetails.tokenScore : 0,
          debug_final_score: score
        };
      });

      // Generate new Excel file
      const newWorksheet = xlsx.utils.json_to_sheet(processedRows);
      const newWorkbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, "Results");
      
      const excelBuffer = xlsx.write(newWorkbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Disposition", 'attachment; filename="rfq_results.xlsx"');
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(excelBuffer);

    } catch (error: any) {
      console.error("Upload processing error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/jobs/:jobId/process", async (req, res) => {
    const { jobId } = req.params;
    
    try {
      // 1. Fetch the job details (assuming it contains the RFQs to process, or we fetch them separately)
      // For this example, let's assume the request body contains the RFQs
      const { rfqs } = req.body;
      
      if (!rfqs || !Array.isArray(rfqs)) {
        return res.status(400).json({ error: "Missing or invalid rfqs array in request body" });
      }

      // 2. Fetch product catalogue data
      const { data: catalogue, error: catalogueError } = await supabase
        .from("product_catalogue")
        .select("*");

      if (catalogueError) {
        throw new Error(`Failed to fetch catalogue: ${catalogueError.message}`);
      }

      // Fetch rules
      const { data: rules, error: rulesError } = await supabase
        .from("rules")
        .select("*");

      if (rulesError) {
        throw new Error(`Failed to fetch rules: ${rulesError.message}`);
      }

      let matchedCount = 0;
      let errorCount = 0;
      const results = [];

      // 3. Process each RFQ
      for (const rfq of rfqs) {
        try {
          const normalizedDescription = applyRules(rfq.description, rules || []);
          
          // Detect category and filter catalogue
          const detectedCategory = detectCategory(normalizedDescription);
          let filteredCatalogue = catalogue || [];
          if (detectedCategory) {
            filteredCatalogue = filteredCatalogue.filter(item => item.category === detectedCategory);
          }
          
          const { bestMatch, score, rfqAttrs, matchDetails } = matchRfq(normalizedDescription, filteredCatalogue);
          
          if (bestMatch && score > 0) {
            results.push({
              job_id: jobId,
              rfq_id: rfq.id,
              product_id: bestMatch.id,
              match_score: score,
              status: 'matched',
              detected_category: detectedCategory,
              normalized_input: normalizedDescription,
              extracted_attributes: rfqAttrs,
              match_details: matchDetails
            });
            matchedCount++;
          } else {
            results.push({
              job_id: jobId,
              rfq_id: rfq.id,
              product_id: null,
              match_score: 0,
              status: 'no_match',
              detected_category: detectedCategory,
              normalized_input: normalizedDescription,
              extracted_attributes: rfqAttrs,
              match_details: matchDetails
            });
            errorCount++; // Or just not matched
          }
        } catch (err) {
          errorCount++;
        }
      }

      // 3.5 Upsert job to ensure it exists before inserting results
      const { error: upsertJobError } = await supabase
        .from("jobs")
        .upsert({
          id: jobId,
          status: "processing",
          created_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (upsertJobError) {
        console.warn(`Failed to upsert job (might not exist in schema): ${upsertJobError.message}`);
      }

      // 4. Insert results into job_results table
      if (results.length > 0) {
        // Strip out extra fields for DB insert to avoid schema errors
        const dbResults = results.map(({ extracted_attributes, match_details, ...rest }) => rest);
        const { error: insertError } = await supabase
          .from("job_results")
          .insert(dbResults);
          
        if (insertError) {
          throw new Error(`Failed to insert results: ${insertError.message}`);
        }
      }

      // 5. Update jobs table
      const { error: updateError } = await supabase
        .from("jobs")
        .update({
          status: "completed",
          matched_count: matchedCount,
          error_count: errorCount
        })
        .eq("id", jobId);

      if (updateError) {
        throw new Error(`Failed to update job: ${updateError.message}`);
      }

      res.json({
        success: true,
        jobId,
        matchedCount,
        errorCount,
        results
      });

    } catch (error: any) {
      console.error("Job processing error:", error);
      
      // Attempt to update job status to error
      await supabase
        .from("jobs")
        .update({
          status: "failed",
          error_message: error.message
        })
        .eq("id", jobId);

      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
