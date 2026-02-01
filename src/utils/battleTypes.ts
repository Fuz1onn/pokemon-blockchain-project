export type BattlePokemon = {
  id: string;
  name: string;
  image?: string | null;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  level: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  owner: "PLAYER" | "AI";
};

export type BattleMove = {
  name: string;
  power: number;
};

export type BattleResult = {
  matchId: string;
  a: BattlePokemon;
  b: BattlePokemon;
  winner: "A" | "B" | "DRAW";
  rounds: number;
  log: string[];
};

export type StandingRow = {
  pokemonId: string;
  name: string;
  owner: "PLAYER" | "AI";
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  hpDiff: number;
};
