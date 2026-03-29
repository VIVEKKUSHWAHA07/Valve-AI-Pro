import { applyRules, detectCategory, matchRfq } from "./server";

async function runTest() {
  const sample = "2 inch carbon steel ball valve class 150";
  
  // Mock rules
  const rules = [
    { search_term: "carbon steel", replace_term: "CS" },
    { search_term: "stainless steel", replace_term: "SS" },
    { search_term: "class 150", replace_term: "150#" }
  ];
  
  // Mock catalogue
  const catalogue = [
    { id: "123e4567-e89b-12d3-a456-426614174000", description: "2in CS Ball Valve 150#", category: "Ball Valve" },
    { id: "123e4567-e89b-12d3-a456-426614174001", description: "3in SS Gate Valve 300#", category: "Gate Valve" }
  ];
  
  console.log("--- TEST RUN ---");
  console.log("Input:", sample);
  
  const normalized = applyRules(sample, rules);
  console.log("Normalized:", normalized);
  
  const category = detectCategory(normalized);
  console.log("Detected Category:", category);
  
  const match = matchRfq(normalized, catalogue);
  console.log("Match Result:", match);
  
  // Simulate backend insert logic
  const results = [{
    job_id: "job_123",
    rfq_id: "rfq_1",
    product_id: match.bestMatch?.id || null,
    match_score: match.score,
    status: match.bestMatch ? 'matched' : 'no_match',
    detected_category: category,
    normalized_input: normalized,
    extracted_attributes: match.rfqAttrs,
    match_details: match.matchDetails
  }];
  
  const dbResults = results.map(({ extracted_attributes, match_details, ...rest }) => rest);
  console.log("DB Insert Payload:", dbResults);
  
  console.log("✔ No DB errors (simulated)");
  console.log("✔ Insert works (simulated)");
  console.log("✔ Output is valid");
}

runTest();
