export interface Stats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  specialAttack?: number;
  specialDefense?: number;
}

// For randomly generated Pokémon (not yet minted)
export interface GeneratedPokemon {
  id: number; // Pokédex ID
  name: string;
  image: string;
  type: string;
  rarity: string;
  price: number; // USD price
  ethPrice: number; // ETH price
  tempId: string; // Temporary UUID for frontend tracking
  level: number;
  timestamp: number;
  stats: Stats;
  metadataUri?: string; // For minting
}

// For actual minted NFTs on blockchain
export interface MintedPokemon {
  id: number; // Pokédex ID
  name: string;
  image: string;
  type: string;
  rarity: string;
  price: number; // USD price
  ethPrice: number; // ETH price
  tokenId: number; // Actual blockchain token ID
  level: number;
  timestamp: number;
  stats: Stats;
  seller: string; // Wallet address of seller
  isListed: boolean;
}

export interface MarketplaceFilters {
  type: string;
  rarity: string;
  level: string;
  price: string;
}

export interface MarketplaceState {
  generalPokemons: GeneratedPokemon[]; // Random generated
  playerListings: MintedPokemon[]; // Player listed NFTs
  lastRefresh: number; // Timestamp of last refresh
  refreshInterval: number; // 12 or 24 hours in ms
}
