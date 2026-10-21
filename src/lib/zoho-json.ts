/**
 * Zoho's Mail webhook and API use large numeric JSON identifiers. JavaScript
 * rounds integers above Number.MAX_SAFE_INTEGER, corrupting IDs used in API
 * paths. Preserve identifier tokens as strings before JSON.parse; other fields
 * keep their normal JSON types.
 */
export function parseZohoJson<T = unknown>(source: string): T {
  const identifierKeys = new Set(["accountId", "folderId", "messageId", "threadId"]);
  let output = "";
  let index = 0;

  while (index < source.length) {
    if (source[index] !== '"') {
      output += source[index++];
      continue;
    }

    const stringStart = index++;
    while (index < source.length) {
      if (source[index] === "\\") { index += 2; continue; }
      if (source[index++] === '"') break;
    }
    const rawString = source.slice(stringStart, index);
    let key: unknown;
    try { key = JSON.parse(rawString); } catch { key = null; }

    let valueStart = index;
    while (/\s/.test(source[valueStart] ?? "")) valueStart++;
    if (typeof key === "string" && identifierKeys.has(key) && source[valueStart] === ":") {
      valueStart++;
      while (/\s/.test(source[valueStart] ?? "")) valueStart++;
      const numeric = /^(?:0|[1-9]\d*)(?=\s*[,}\]])/.exec(source.slice(valueStart));
      if (numeric) {
        output += rawString + source.slice(index, valueStart) + JSON.stringify(numeric[0]);
        index = valueStart + numeric[0].length;
        continue;
      }
    }
    output += rawString;
  }

  return JSON.parse(output) as T;
}
