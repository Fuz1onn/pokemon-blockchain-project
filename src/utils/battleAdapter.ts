import type { BattlePokemon } from "./battleTypes";

export type OwnedPokemonLike = {
  tokenId: number;
  name: string;
  image?: string | null;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  level: number;
  stats: { hp: number; attack: number; defense: number; speed: number };
};

export function toBattlePokemon(p: OwnedPokemonLike): BattlePokemon {
  return {
    id: `nft-${p.tokenId}`,
    tokenId: p.tokenId,
    name: p.name,
    image: p.image ?? null,
    rarity: p.rarity,
    level: p.level,
    hp: p.stats.hp,
    attack: p.stats.attack,
    defense: p.stats.defense,
    speed: p.stats.speed,
    owner: "PLAYER",
  };
}
