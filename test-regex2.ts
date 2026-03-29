function extractAttributes(text: string) {
  const attrs = {
    size: null as string | null,
    material: null as string | null,
    pressure: null as string | null
  };

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
  return attrs;
}

console.log(extractAttributes('3" BALL VALVE ASTM A105 RF API 6D FIRE SAFE CL150'));
console.log(extractAttributes('3" BALL VALVE ASTM A105 RF API 6D FIRE SAFE 150#'));
console.log(extractAttributes('3" BALL VALVE ASTM A105 RF API 6D FIRE SAFE PN16'));
console.log(extractAttributes('3" BALL VALVE ASTM A105 RF API 6D FIRE SAFE class 300'));
