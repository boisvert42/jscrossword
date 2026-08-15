/**
 * vector_symbols.js
 *
 * Provides native vector drawing functions for math and Greek symbols in jsPDF.
 * This avoids bundling heavy font files or images, keeping output files tiny and sharp.
 */

export const vectorSymbols = {
  '∀': (doc, x, y, size) => {
    // Upside-down A (drawn as continuous legs + separate crossbar)
    const capHeight = size * 0.72;
    const width = size * 0.55;
    const padX = (size - width) / 2;
    const xStart = x + padX;
    
    const yTop = y - capHeight;
    const yBot = y;
    const yMid = yTop + (yBot - yTop) * 0.55;

    // Draw legs
    doc.moveTo(xStart, yTop);
    doc.lineTo(xStart + width/2, yBot);
    doc.lineTo(xStart + width, yTop);
    doc.stroke();

    // Draw crossbar
    doc.moveTo(xStart + width * 0.22, yMid);
    doc.lineTo(xStart + width * 0.78, yMid);
    doc.stroke();
  },

  '∈': (doc, x, y, size) => {
    // Element of (continuous curved C + separate middle bar)
    const capHeight = size * 0.72;
    const width = size * 0.52;
    const padX = (size - width) / 2;
    const xStart = x + padX;

    const yTop = y - capHeight;
    const yBot = y;
    const yMid = yTop + (yBot - yTop) * 0.5;
    const yQuarter = (yBot - yTop) * 0.22;

    // Draw C curve
    doc.moveTo(xStart + width * 0.8, yTop);
    doc.lineTo(xStart + width * 0.35, yTop);
    doc.lineTo(xStart + width * 0.05, yTop + yQuarter);
    doc.lineTo(xStart + width * 0.05, yBot - yQuarter);
    doc.lineTo(xStart + width * 0.35, yBot);
    doc.lineTo(xStart + width * 0.8, yBot);
    doc.stroke();

    // Draw middle bar
    doc.moveTo(xStart + width * 0.05, yMid);
    doc.lineTo(xStart + width * 0.7, yMid);
    doc.stroke();
  },

  '≥': (doc, x, y, size) => {
    // Greater than or equal to (continuous angle + separate flat bar)
    const capHeight = size * 0.72;
    const width = size * 0.55;
    const padX = (size - width) / 2;
    const xStart = x + padX;

    const yTop = y - capHeight;
    const yBot = y;
    
    const yAngleTop = yTop + (yBot - yTop) * 0.05;
    const yAngleMid = yTop + (yBot - yTop) * 0.38;
    const yAngleBot = yTop + (yBot - yTop) * 0.72;
    const yFlat = yBot - (yBot - yTop) * 0.05;

    // Draw angle (with round join at the vertex)
    doc.moveTo(xStart, yAngleTop);
    doc.lineTo(xStart + width, yAngleMid);
    doc.lineTo(xStart, yAngleBot);
    doc.stroke();

    // Draw flat bar
    doc.moveTo(xStart, yFlat);
    doc.lineTo(xStart + width, yFlat);
    doc.stroke();
  },

  'Ω': (doc, x, y, size) => {
    // Greek Capital Omega (drawn as a single continuous path)
    const capHeight = size * 0.72;
    const width = size * 0.65;
    const padX = (size - width) / 2;
    const xStart = x + padX;

    const yTop = y - capHeight;
    const yBot = y;
    const yRise = yBot - (yBot - yTop) * 0.22;
    const yMidHeight = yTop + (yBot - yTop) * 0.45;

    // Draw entire symbol as a single continuous line path
    doc.moveTo(xStart, yBot);
    doc.lineTo(xStart + width * 0.25, yBot);                                     // left foot
    doc.lineTo(xStart + width * 0.3, yRise);                                     // left vertical rise
    doc.lineTo(xStart + width * 0.12, yMidHeight);                               // left bulge
    doc.lineTo(xStart + width * 0.32, yTop);                                     // left top curve
    doc.lineTo(xStart + width * 0.68, yTop);                                     // top horizontal
    doc.lineTo(xStart + width * 0.88, yMidHeight);                               // right top curve
    doc.lineTo(xStart + width * 0.7, yRise);                                     // right bulge
    doc.lineTo(xStart + width * 0.75, yBot);                                     // right vertical drop
    doc.lineTo(xStart + width, yBot);                                            // right foot
    doc.stroke();
  }
};

/**
 * Main dispatcher to draw a custom vector symbol if it is supported.
 * Returns true if the symbol was drawn, false if not supported.
 */
export function drawVectorSymbol(doc, char, x, y, size) {
  const drawFunc = vectorSymbols[char];
  if (!drawFunc) return false;

  const currentLineWidth = doc.getLineWidth();
  
  // Set line width proportional to the font size
  doc.setLineWidth(size * 0.08);
  
  // Set round caps and joins to make lines merge smoothly and look soft/font-like
  doc.setLineCap('round');
  doc.setLineJoin('round');

  drawFunc(doc, x, y, size);

  // Restore previous line states
  doc.setLineWidth(currentLineWidth);
  doc.setLineCap('butt');
  doc.setLineJoin('miter');
  return true;
}
