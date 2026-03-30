import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://stqkpgkyvtmvvijilgmc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0cWtwZ2t5dnRtdnZpamlsZ21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NjcyMzYsImV4cCI6MjA5MDI0MzIzNn0.92FxL9YuEwesIb1T-vowKqY1no58a0FKIGwBqlMu-uw";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS filename TEXT;
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS total_count INTEGER;
      ALTER TABLE jobs DROP COLUMN IF EXISTS total_rows;
      
      ALTER TABLE job_results ADD COLUMN IF NOT EXISTS original_description TEXT;
      ALTER TABLE job_results ADD COLUMN IF NOT EXISTS detected_category TEXT;
      ALTER TABLE job_results ADD COLUMN IF NOT EXISTS matched_name TEXT;
      ALTER TABLE job_results ADD COLUMN IF NOT EXISTS matched_code TEXT;
      ALTER TABLE job_results ADD COLUMN IF NOT EXISTS match_score FLOAT;
      ALTER TABLE job_results ADD COLUMN IF NOT EXISTS status TEXT;
    `
  });
  console.log("Error:", error);
  console.log("Data:", data);
}

run();
