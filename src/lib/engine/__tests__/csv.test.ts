import { describe, it, expect } from "vitest";
import { parseCsv } from "../csv";

describe("parseCsv", () => {
  it("parses basic CSV", () => {
    const csv = "name,age\nAlice,30\nBob,25";
    const result = parseCsv(csv);
    expect(result.headers).toEqual(["name", "age"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ line: 2, values: ["Alice", "30"], raw: "Alice,30" });
    expect(result.rows[1]).toEqual({ line: 3, values: ["Bob", "25"], raw: "Bob,25" });
  });

  it("handles quoted fields with embedded commas", () => {
    const csv = 'name,description\nAlice,"likes cats, dogs"\nBob,"no hobbies"';
    const result = parseCsv(csv);
    expect(result.rows[0].values).toEqual(["Alice", "likes cats, dogs"]);
    expect(result.rows[1].values).toEqual(["Bob", "no hobbies"]);
  });

  it("handles escaped quotes inside quoted fields", () => {
    const csv = 'text\n"she said ""hello"" to me"';
    const result = parseCsv(csv);
    expect(result.rows[0].values).toEqual(['she said "hello" to me']);
  });

  it("rejects an unterminated quoted field", () => {
    expect(() => parseCsv('name,description\nAlice,"missing closing quote')).toThrow(
      "unterminated quoted field",
    );
  });

  it("handles CRLF line endings", () => {
    const csv = "a,b\r\n1,2\r\n3,4";
    const result = parseCsv(csv);
    expect(result.headers).toEqual(["a", "b"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].line).toBe(2);
    expect(result.rows[1].line).toBe(3);
  });

  it("assigns correct 1-based line numbers", () => {
    const csv = "h1,h2\nrow1\nrow2\nrow3";
    const result = parseCsv(csv);
    expect(result.rows[0].line).toBe(2);
    expect(result.rows[1].line).toBe(3);
    expect(result.rows[2].line).toBe(4);
  });

  it("skips blank lines", () => {
    const csv = "a\n1\n\n2\n";
    const result = parseCsv(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].values).toEqual(["1"]);
    expect(result.rows[1].values).toEqual(["2"]);
  });

  it("returns empty for empty input", () => {
    const result = parseCsv("");
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it("trims whitespace from fields", () => {
    const csv = "a , b \n 1 , 2 ";
    const result = parseCsv(csv);
    expect(result.headers).toEqual(["a", "b"]);
    expect(result.rows[0].values).toEqual(["1", "2"]);
  });
});
