export type SupportMatch = {
  slug: string;
  title: string;
  category: string;
  content: string;
  similarity: number;
};

export type SupportRetrievalResult = {
  matches: SupportMatch[];
  confidence: "high" | "medium" | "low";
  handoffSuggested: boolean;
};

export function scoreSupportMatches(
  matches: SupportMatch[],
  minSimilarity = 0.75,
): SupportRetrievalResult {
  if (!matches.length) {
    return { matches, confidence: "low", handoffSuggested: true };
  }

  const topScore = matches[0]?.similarity ?? 0;
  if (topScore < minSimilarity) {
    return { matches: [], confidence: "low", handoffSuggested: true };
  }

  if (topScore >= 0.86) {
    return { matches, confidence: "high", handoffSuggested: false };
  }

  if (topScore >= 0.78) {
    return { matches, confidence: "medium", handoffSuggested: false };
  }

  return { matches, confidence: "low", handoffSuggested: true };
}

export function buildSupportContext(matches: SupportMatch[]) {
  return matches
    .map(
      (match) =>
        `[source: ${match.slug}#${match.title}]\n${match.content.trim()}`,
    )
    .join("\n\n");
}

export function buildExcerpt(content: string, maxLength = 200) {
  const clean = content.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) {
    return clean;
  }
  return `${clean.slice(0, maxLength).trim()}...`;
}
