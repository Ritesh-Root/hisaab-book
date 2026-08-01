/**
 * Minimal RFC 4180 CSV parser.
 * - Handles quoted fields with embedded commas and CRLF.
 * - Returns 1-based physical line numbers (header = line 1).
 * - Throws on malformed input (unterminated quote).
 */

export interface ParsedCsv {
  headers: string[];
  rows: { line: number; values: string[]; raw: string }[];
}

export class UnknownFormatError extends Error {
  constructor(
    public readonly unrecognized: string[],
    app: string,
  ) {
    super(`UnknownFormatError (${app}): unrecognized headers: ${unrecognized.join(", ")}`);
    this.name = "UnknownFormatError";
  }
}

/**
 * Split a CSV text into physical lines preserving CRLF awareness.
 * A "line" is delimited by \n or \r\n. Blank trailing line is dropped.
 */
function splitLines(text: string): string[] {
  // Normalize CRLF to LF first for simplicity; we preserve the raw for evidence.
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  // Drop trailing empty line if file ends with newline
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

/**
 * Parse a single CSV line into fields. Handles quoted fields with embedded commas.
 * Does NOT handle embedded newlines inside quotes (not needed for our CSVs).
 */
function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
        i++;
      } else {
        current += ch;
        i++;
      }
    }
  }
  if (inQuotes) {
    throw new Error("Malformed CSV: unterminated quoted field");
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Parse CSV text into structured data.
 * @param text - The raw CSV string
 * @returns Parsed headers and rows with 1-based line numbers
 */
export function parseCsv(text: string): ParsedCsv {
  const lines = splitLines(text);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseLine(lines[0]);
  const rows: ParsedCsv["rows"] = [];

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    // Skip blank lines
    if (raw.trim() === "") continue;
    const values = parseLine(raw);
    rows.push({ line: i + 1, values, raw });
  }

  return { headers, rows };
}
