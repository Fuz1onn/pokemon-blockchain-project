import type { BattlePokemon } from "./battleTypes";

const AI_POOL: Omit<BattlePokemon, "id" | "owner">[] = [
  { name: "Pidgeotto", image: null, rarity: "Common", level: 8, hp: 64, attack: 52, defense: 44, speed: 56 },
  { name: "Kadabra", image: null, rarity: "Rare", level: 10, hp: 55, attack: 70, defense: 38, speed: 72 },
  { name: "Arcanine", image: null, rarity: "Epic", level: 12, hp: 90, attack: 88, defense: 72, speed: 74 },
  { name: "Gyarados", image: null, rarity: "Epic", level: 13, hp: 95, attack: 92, defense: 79, speed: 70 },
  { name: "Gengar", image: null, rarity: "Epic", level: 11, hp: 60, attack: 85, defense: 55, speed: 80 },
  { name: "Machamp", image: null, rarity: "Rare", level: 12, hp: 88, attack: 84, defense: 70, speed: 55 },
];

const rand = (n: number) => Math.floor(Math.random() * n);

export function generateAiTeam(size: number): BattlePokemon[] {
  const picked: BattlePokemon[] = [];
  const used = new Set<number>();

  while (picked.length < size) {
    const idx = rand(AI_POOL.length);
    if (used.has(idx)) continue;
    used.add(idx);

    const base = AI_POOL[idx];
    picked.push({
      ...base,
      id: `ai-${base.name}-${Date.now()}-${picked.length}`,
      owner: "AI",
    });
  }

  return picked;
}
