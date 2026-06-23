export interface MonsterDefinition {
  id: string;
  family: string;
}

export const MONSTER_DEFINITIONS: MonsterDefinition[] = [{ id: "sprout", family: "leaf" }];

export class MonsterRenderer {
  renderMonster(_definition: MonsterDefinition) {}
}
