import { applyRules, detectCategory, matchRfq } from "./server";

async function runTest() {
  const inputs = [
    '3" BALL VALVE ASTM A105 RF API 6D FIRE SAFE',
    'DN50 BALL VALVE F316 CL300 RF EXTENSION STEM',
    'CHECK VALVE SPRING LOADED SS316'
  ];
  
  // Mock catalogue
  const catalogue = [
    { id: "1", description: "3 inch carbon steel ball valve class 150", category: "Ball Valve", size: "3 inch", material: "carbon steel", pressure: "class 150" },
    { id: "2", description: "2 inch stainless steel ball valve class 300", category: "Ball Valve", size: "2 inch", material: "stainless steel", pressure: "class 300" },
    { id: "3", description: "check valve stainless steel", category: "ValveType", material: "stainless steel" }
  ];
  
  console.log("--- TEST RUN ---");
  for (const sample of inputs) {
    console.log("Input:", sample);
    const normalized = applyRules(sample, []);
    console.log("Normalized:", normalized);
    
    const category = detectCategory(normalized);
    console.log("Detected Category:", category);
    
    const match = matchRfq(normalized, catalogue);
    console.log("Extracted Attributes:", match.rfqAttrs);
    console.log("Match Result:", {
      bestMatch: match.bestMatch?.description,
      score: match.score,
      matchDetails: match.matchDetails
    });
    console.log("---");
  }
}

runTest();
