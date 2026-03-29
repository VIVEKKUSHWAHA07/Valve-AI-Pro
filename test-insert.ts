import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://stqkpgkyvtmvvijilgmc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0cWtwZ2t5dnRtdnZpamlsZ21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NjcyMzYsImV4cCI6MjA5MDI0MzIzNn0.92FxL9YuEwesIb1T-vowKqY1no58a0FKIGwBqlMu-uw";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('job_results').insert({
    job_id: 'test',
    status: 'test',
    rfq_id: 'test',
    product_id: '123e4567-e89b-12d3-a456-426614174000',
    detected_category: 'test',
    match_score: 1.0,
    normalized_input: 'test'
  });
  console.log("Error:", error);
}

run();
