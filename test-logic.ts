import { applyRules, matchRfq } from "./server";

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

function extractAttributes(text: string) {
  const attrs = {
    size: null as string | null,
    material: null as string | null,
    pressure: null as string | null
  };

  const sizeMatch = text.match(/\b(\d+(?:\.\d+)?|\d+\/\d+)\s*(?:inch|"|in|mm)\b|\bdn\s*(\d+)\b/i);
  if (sizeMatch) {
    if (sizeMatch[2]) {
      const dn = parseInt(sizeMatch[2], 10);
      if (dn === 25) attrs.size = "1 inch";
      else if (dn === 50) attrs.size = "2 inch";
      else if (dn === 80) attrs.size = "3 inch";
      else attrs.size = `dn${dn}`;
    } else {
      attrs.size = `${sizeMatch[1]} inch`;
    }
  }

  const pressureMatch = text.match(/\b(?:class\s*\d+|\d+\s*(?:#|lb|psi)|pn\s*\d+)\b/i);
  if (pressureMatch) {
    let p = pressureMatch[0].toLowerCase();
    if (p.startsWith('class')) {
      attrs.pressure = p.replace(/\s+/, ' ');
    } else if (p.endsWith('#') || p.endsWith('lb') || p.endsWith('psi')) {
      const num = p.replace(/\D/g, '');
      attrs.pressure = `class ${num}`;
    } else {
      attrs.pressure = p.replace(/\s+/g, '');
    }
  }

  const materialMatch = text.match(/\b(?:stainless steel|carbon steel|brass|bronze|cast iron|ductile iron|pvc|cpvc|alloy)\b/i);
  if (materialMatch) {
    attrs.material = materialMatch[0].toLowerCase().replace(/\s+/g, ' ');
  }

  return attrs;
}

function test() {
  const inputs = [
    '3" BALL VALVE ASTM A105 RF API 6D FIRE SAFE',
    'DN50 BALL VALVE F316 CL300 RF EXTENSION STEM',
    'CHECK VALVE SPRING LOADED SS316'
  ];

  for (const input of inputs) {
    let normalized = input;
    for (const rule of BUILT_IN_RULES) {
      const escapedSearch = rule.search_term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedSearch}\\b`, 'gi');
      normalized = normalized.replace(regex, rule.replace_term);
    }
    console.log("Input:", input);
    console.log("Normalized:", normalized);
    console.log("Attributes:", extractAttributes(normalized));
    console.log("---");
  }
}

test();
