/*******************
 * .xd reading/writing functions
 * copyright (c) 2024 Crossword Nexus
 * MIT License https://opensource.org/licenses/MIT
 *******************/

import { xwGrid } from "../grid.js";

/**
 * Parses an .xd file from a Uint8Array.
 * Spec: https://github.com/century-arcade/xd/blob/master/doc/xd-format.md
 */
export function xw_read_xd(inputData) {
  if (!(inputData instanceof Uint8Array)) {
    throw new Error("XD parser expects Uint8Array input");
  }

  const text = new TextDecoder("utf-8").decode(inputData);
  const lines = text.split(/\r?\n/);

  // Split into sections
  // Sections are separated by 2+ blank lines OR by ## headers
  const sections = [];
  let currentSection = [];
  let blankLineCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    const isExplicitHeader = line.startsWith("## ");
    
    // If we hit a header or 2+ blank lines, start a new section
    if (isExplicitHeader || blankLineCount >= 2) {
      if (currentSection.length > 0) {
        // Remove trailing blank lines
        while (currentSection.length > 0 && currentSection[currentSection.length - 1].trim() === "") {
          currentSection.pop();
        }
        if (currentSection.length > 0) {
          sections.push(currentSection);
        }
      }
      currentSection = [];
      blankLineCount = 0;
    }

    if (line.trim() === "") {
      blankLineCount++;
    } else {
      blankLineCount = 0;
    }
    currentSection.push(line);
  }
  if (currentSection.length > 0) {
    while (currentSection.length > 0 && currentSection[currentSection.length - 1].trim() === "") {
      currentSection.pop();
    }
    if (currentSection.length > 0) {
      sections.push(currentSection);
    }
  }

  const metadata = {
    title: "",
    author: "",
    copyright: "",
    description: "",
    height: 0,
    width: 0,
    crossword_type: "crossword"
  };

  const rebus = {};
  let gridLines = [];
  let clueSections = [];

  const parseMetadata = (lines) => {
    lines.forEach(line => {
      const colonIndex = line.indexOf(":");
      if (colonIndex !== -1) {
        const key = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();
        if (key === "title") metadata.title = value;
        else if (key === "author") metadata.author = value;
        else if (key === "copyright") metadata.copyright = value;
        else if (key === "notes" || key === "description") metadata.description = value;
        else if (key === "rebus") {
          const parts = value.split("=");
          if (parts.length === 2) {
            rebus[parts[0].trim()] = parts[1].trim().toUpperCase();
          }
        }
      }
    });
  };

  sections.forEach(section => {
    // Remove leading blank lines
    while (section.length > 0 && section[0].trim() === "") {
      section.shift();
    }
    if (section.length === 0) return;

    if (section[0].startsWith("##")) {
      const header = section[0].substring(2).trim().toLowerCase();
      const content = section.slice(1);
      // Remove leading blank lines from content
      while (content.length > 0 && content[0].trim() === "") {
        content.shift();
      }

      if (header === "metadata") {
        parseMetadata(content);
      } else if (header === "grid") {
        gridLines = content;
      } else if (header === "across" || header === "down" || header === "clues") {
        clueSections.push(content);
      }
    } else {
      // Heuristic parsing for implicit sections
      // Check if it's a grid (mostly A-Z, #, .)
      const isGrid = section.every(line => line.match(/^[A-Z#0-9.a-z ]+$/i)) && section.length > 1;
      const isClues = section[0].match(/^[AD]\d+\./i);

      if (isGrid && gridLines.length === 0) {
        gridLines = section;
      } else if (isClues) {
        clueSections.push(section);
      } else {
        // Assume metadata for the first section if not otherwise identified
        if (metadata.title === "" && metadata.author === "") {
            parseMetadata(section);
        }
      }
    }
  });

  if (gridLines.length === 0) {
    throw new Error("Could not find grid section in XD file.");
  }

  // Remove any trailing empty lines that might have sneaked into gridLines
  while (gridLines.length > 0 && gridLines[gridLines.length - 1].trim() === "") {
    gridLines.pop();
  }

  metadata.height = gridLines.length;
  metadata.width = gridLines[0] ? gridLines[0].length : 0;

  if (metadata.width === 0) {
    throw new Error("Grid width is zero. Invalid grid section.");
  }

  const cells = [];
  for (let y = 0; y < metadata.height; y++) {
    const row = gridLines[y];
    for (let x = 0; x < metadata.width; x++) {
      const char = row[x] || " ";
      let solution = char.toUpperCase();
      let type = null;
      let background_shape = null;

      if (char === "#" || char === ".") {
        type = "block";
        solution = null;
      } else if (char >= "a" && char <= "z") {
        background_shape = "circle";
      }

      if (rebus[char]) {
        solution = rebus[char];
      }

      cells.push({
        x,
        y,
        solution,
        type,
        "background-shape": background_shape,
        number: null // Will be filled by xwGrid
      });
    }
  }

  const grid = new xwGrid(cells);
  const gridNumbers = grid.gridNumbering();
  cells.forEach(c => {
    const num = gridNumbers[c.y][c.x];
    if (num > 0) c.number = num.toString();
  });

  const parsedClues = {
    across: {},
    down: {}
  };

  clueSections.forEach(section => {
    section.forEach(line => {
      // Format: A1. Clue text ~ ANSWER
      const match = line.match(/^([AD])(\d+)\.\s*(.*?)~\s*(.*)$/i);
      if (match) {
        const dir = match[1].toUpperCase() === "A" ? "across" : "down";
        const num = match[2];
        const text = match[3].trim();
        parsedClues[dir][num] = text;
      }
    });
  });

  const acrossEntries = grid.acrossEntries();
  const downEntries = grid.downEntries();

  const clues = [
    { title: "Across", clue: [] },
    { title: "Down", clue: [] }
  ];
  const words = [];
  let wordId = 1;

  // Process Across
  Object.keys(acrossEntries).forEach(num => {
    const entry = acrossEntries[num];
    const text = parsedClues.across[num] || "";
    const id = (wordId++).toString();
    clues[0].clue.push({
      word: id,
      number: num,
      text: text
    });
    words.push({
      id: id,
      cells: entry.cells
    });
  });

  // Process Down
  Object.keys(downEntries).forEach(num => {
    const entry = downEntries[num];
    const text = parsedClues.down[num] || "";
    const id = (wordId++).toString();
    clues[1].clue.push({
      word: id,
      number: num,
      text: text
    });
    words.push({
      id: id,
      cells: entry.cells
    });
  });

  return {
    metadata,
    cells,
    words,
    clues
  };
}
