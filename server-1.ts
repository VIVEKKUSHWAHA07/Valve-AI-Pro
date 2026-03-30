import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import multer from "multer";
import * as xlsx from "xlsx";
import * as dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://stqkpgkyvtmvvijilgmc.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

const upload = multer({ storage: multer.memoryStorage() });

// Basic Category Detection to help fuzzy match if the user's Excel lacks a category column
function detectCategory(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes("ball valve") || t.includes("gate valve") || t.includes("globe valve")) return "ValveType";
  if (t.includes("gasket") || t.includes("o ring")) return "Gasket";
  if (t.includes("packing") || t.includes("stem packing")) return "Packing";
  if (t.includes("trim")) return "Trim";
  if (t.includes("operator") || t.includes("actuator")) return "OPERATOR";
  if (t.includes("accessories")) return "Accessories";
  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Protected route for RFQ uploading
  app.post("/api/jobs/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Require user to be authenticated
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Missing Authorization header" });
      }

      // Create an authenticated Supabase client for this request
      const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } }
      });

      // Optionally verify user session
      const { data: { user }, error: authError } = await userSupabase.auth.getUser();
      if (authError || !user) {
        return res.status(401).json({ error: "Unauthorized or invalid token" });
      }

      // Parse incoming Excel
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(worksheet) as any[];

      if (rows.length === 0) {
        return res.status(400).json({ error: "Excel file is empty" });
      }

      // Identify key columns
      const firstRow = rows[0];
      const keys = Object.keys(firstRow);
      const descKey = keys.find(k => k.toLowerCase().includes("description") || k.toLowerCase().includes("rfq")) || keys[0];
      const catKey = keys.find(k => k.toLowerCase().includes("categor"));

      const processedRows = [];
      
      // We will create a fresh job in the database
      const { data: currentJob, error: jobErr } = await userSupabase.from("jobs").insert({
        user_id: user.id,
        filename: req.file.originalname,
        status: "processing",
        total_count: rows.length
      }).select().single();

      if (jobErr) console.warn("Failed to create job tracking record:", jobErr.message);

      let matchedCount = 0;
      let errorCount = 0;

      // Process row by row (using sequential await because of DB calls; in a real app, chunks of Promise.all are better)
      for (const row of rows) {
        const description = String(row[descKey] || "").trim();
        const rowCategory = catKey ? String(row[catKey]).trim() : detectCategory(description);

        let bestCode = null;
        let bestScore = 0;
        let bestName = null;

        if (description) {
          // Call to the product_lookup table via our pg_trgm RPC
          const { data: matches, error } = await userSupabase.rpc("match_product", {
            p_category: rowCategory || null,
            p_search: description,
            p_threshold: 0.15, // minimum similarity score
            p_limit: 1
          });

          if (!error && matches && matches.length > 0) {
            bestCode = matches[0].code;
            bestScore = matches[0].score;
            bestName = matches[0].name;
          }
        }

        const newRow = {
          ...row,
          DetectedCategory: rowCategory || "Unknown",
          MatchedName: bestName || "No Match",
          MatchedCode: bestCode || "N/A",
          MatchScore: bestScore ? bestScore.toFixed(3) : 0
        };
        processedRows.push(newRow);

        if (bestCode) matchedCount++;
        else errorCount++;
      }

      // Update job record
      if (currentJob) {
        await userSupabase.from("jobs").update({
          status: "completed",
          matched_count: matchedCount,
          error_count: errorCount,
          completed_at: new Date().toISOString()
        }).eq("id", currentJob.id);

        // Insert job results
        const resultsToInsert = processedRows.map(pr => ({
          job_id: currentJob.id,
          original_description: pr[descKey] || "",
          detected_category: pr.DetectedCategory,
          matched_name: pr.MatchedName,
          matched_code: pr.MatchedCode,
          match_score: pr.MatchScore === "N/A" ? 0 : parseFloat(pr.MatchScore) || 0,
          status: pr.MatchedCode !== "N/A" ? "matched" : "unmatched"
        }));

        for (let i = 0; i < resultsToInsert.length; i += 500) {
          const chunk = resultsToInsert.slice(i, i + 500);
          const { error: insertErr } = await userSupabase.from("job_results").insert(chunk);
          if (insertErr) console.warn("Failed to insert job results:", insertErr.message);
        }
      }

      // Generate output Excel
      const newWorksheet = xlsx.utils.json_to_sheet(processedRows);
      const newWorkbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, "Matched Results");
      
      const excelBuffer = xlsx.write(newWorkbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Disposition", 'attachment; filename="rfq_matched_results.xlsx"');
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(excelBuffer);

    } catch (error: any) {
      console.error("Upload processing error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/jobs/:jobId/process", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Missing Authorization header" });
      const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } }
      });

      const { rfqs } = req.body;
      if (!rfqs || !Array.isArray(rfqs)) return res.status(400).json({ error: "Invalid rfqs array" });

      const results = [];
      for (const rfq of rfqs) {
        const description = String(rfq.description || "").trim();
        const rowCategory = detectCategory(description);
        
        let bestCode = null;
        let bestScore = 0;
        let bestName = null;

        if (description) {
          const { data: matches, error } = await userSupabase.rpc("match_product", {
            p_category: rowCategory || null,
            p_search: description,
            p_threshold: 0.15,
            p_limit: 1
          });

          if (!error && matches && matches.length > 0) {
            bestCode = matches[0].code;
            bestScore = matches[0].score;
            bestName = matches[0].name;
          }
        }

        results.push({
          rfq_id: rfq.id,
          original_description: description,
          detected_category: rowCategory || "Unknown",
          matched_name: bestName || "No Match",
          matched_code: bestCode || "N/A",
          match_score: bestScore,
          status: bestCode ? "matched" : "unmatched"
        });
      }

      res.json({ results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/jobs/:jobId/download", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Missing Authorization header" });
      const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } }
      });

      const jobId = req.params.jobId;
      const { data: rows, error } = await userSupabase.from("job_results").select("*").eq("job_id", jobId);
      if (error) throw error;

      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: "No results found for this job" });
      }

      const newWorksheet = xlsx.utils.json_to_sheet(rows);
      const newWorkbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, "Matched Results");
      
      const excelBuffer = xlsx.write(newWorkbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Disposition", `attachment; filename="ValveIQ_Results_${jobId}.xlsx"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(excelBuffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/catalogue/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Missing Authorization header" });
      const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } }
      });

      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(worksheet) as any[];

      if (rows.length === 0) return res.status(400).json({ error: "Excel file is empty" });

      let successCount = 0;
      let failCount = 0;
      const distribution: Record<string, number> = {};

      const firstRow = rows[0];
      const keys = Object.keys(firstRow);
      const catKey = keys.find(k => k.toLowerCase().includes("cat")) || keys[0] || "";
      const nameKey = keys.find(k => k.toLowerCase().includes("name")) || keys[1] || "";
      const codeKey = keys.find(k => k.toLowerCase().includes("code") || k.toLowerCase().includes("sku")) || keys[2] || "";

      const toInsert = rows.map(r => {
        const cat = String(r[catKey] || "Uncategorized").trim();
        distribution[cat] = (distribution[cat] || 0) + 1;
        
        return {
          category: cat,
          name: r[nameKey] ? String(r[nameKey]).trim() : "",
          code: r[codeKey] ? String(r[codeKey]).trim() : "",
          keywords: Object.values(r).join(" ").substring(0, 500)
        };
      });

      // Insert in chunks of 500
      for (let i = 0; i < toInsert.length; i += 500) {
        const chunk = toInsert.slice(i, i + 500);
        const { error } = await userSupabase.from("product_lookup").insert(chunk);
        if (error) {
          console.warn("Error inserting chunk", error.message);
          failCount += chunk.length;
        } else {
          successCount += chunk.length;
        }
      }

      res.json({ successCount, failCount, distribution });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for frontend
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Valve AI Pro SaaS Server running on http://localhost:${PORT}`);
  });
}

startServer();
