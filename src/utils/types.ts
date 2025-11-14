export interface Stats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  specialAttack?: number;
  specialDefense?: number;
}

export interface Pokemon {
  id: number;
  name: string;
  image: string;
  type: string;
  rarity: string;
  price: number;
  tokenId: string;
  level: number;
  timestamp: number;
  stats: Stats;
}

export interface MarketplaceFilters {
  type: string;
  rarity: string;
  level: string;
  price: string;
  latest: string;
}
