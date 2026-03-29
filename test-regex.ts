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
  return attrs;
}

console.log(extractAttributes('3" BALL VALVE ASTM A105 RF API 6D FIRE SAFE'));
console.log(extractAttributes('3", BALL VALVE'));
console.log(extractAttributes('1/2" BALL VALVE'));
console.log(extractAttributes('DN50 BALL VALVE'));
