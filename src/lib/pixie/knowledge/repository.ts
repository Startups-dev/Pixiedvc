import {
  HANNA_V1_AREAS,
  HANNA_V1_ATTRACTIONS,
  HANNA_V1_DINING,
  HANNA_V1_ENTERTAINMENT,
  HANNA_V1_PARKS,
  HANNA_V1_PLANNING_SIGNALS,
  HANNA_V1_RESORTS,
  HANNA_V1_TRANSPORTATION,
} from "@/lib/pixie/knowledge/catalog/static-v1";
import type { HannaKnowledgeRecord, HannaKnowledgeRepository } from "@/lib/pixie/knowledge/types";

export class StaticHannaKnowledgeRepository implements HannaKnowledgeRepository {
  private readonly records: HannaKnowledgeRecord[];
  private readonly byId: Map<string, HannaKnowledgeRecord>;

  constructor(records: HannaKnowledgeRecord[] = [
    ...HANNA_V1_PARKS,
    ...HANNA_V1_AREAS,
    ...HANNA_V1_RESORTS,
    ...HANNA_V1_DINING,
    ...HANNA_V1_ATTRACTIONS,
    ...HANNA_V1_ENTERTAINMENT,
    ...HANNA_V1_TRANSPORTATION,
    ...HANNA_V1_PLANNING_SIGNALS,
  ]) {
    this.records = records;
    this.byId = new Map(records.map((record) => [record.id, record]));
  }

  listRecords(): HannaKnowledgeRecord[] {
    return this.records;
  }

  findById(id: string): HannaKnowledgeRecord | undefined {
    return this.byId.get(id);
  }
}

export function createStaticHannaKnowledgeRepository() {
  return new StaticHannaKnowledgeRepository();
}
