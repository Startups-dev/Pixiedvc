import type { HannaEntityType, HannaKnowledgeRecord, HannaKnowledgeRepository, HannaResolvedEntity } from "@/lib/pixie/knowledge/types";

export function normalizeKnowledgeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function recordEntityType(record: HannaKnowledgeRecord): HannaEntityType {
  return record.entityType;
}

function aliasesFor(record: HannaKnowledgeRecord) {
  return [record.name, ...(record.aliases ?? [])].map((alias) => ({
    raw: alias,
    normalized: normalizeKnowledgeText(alias),
  }));
}

function isStandaloneMatch(message: string, alias: string) {
  if (!alias) return false;
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}(\\s|$)`).test(message);
}

export function resolveHannaEntities(message: string, repository: HannaKnowledgeRepository): HannaResolvedEntity[] {
  const normalizedMessage = normalizeKnowledgeText(message);
  const matches: Array<HannaResolvedEntity & { length: number }> = [];

  for (const record of repository.listRecords()) {
    if (record.entityType === "transportation_connection" || record.entityType === "planning_signal") continue;

    const matched = aliasesFor(record)
      .filter((alias) => alias.normalized.length >= 2 && isStandaloneMatch(normalizedMessage, alias.normalized))
      .sort((a, b) => b.normalized.length - a.normalized.length)[0];

    if (!matched) continue;
    matches.push({
      id: record.id,
      name: record.name,
      entityType: recordEntityType(record),
      matchedAlias: matched.raw,
      length: matched.normalized.length,
    });
  }

  const byId = new Map<string, HannaResolvedEntity & { length: number }>();
  for (const match of matches.sort((a, b) => b.length - a.length)) {
    if (!byId.has(match.id)) byId.set(match.id, match);
  }

  return [...byId.values()].map(({ length: _length, ...match }) => match);
}
