// src/context/MarketplaceContext.tsx
import React, { createContext, useState, type ReactNode } from "react";

// Type for Pokémon
export interface Pokemon {
  id: number;
  name: string;
  image: string;
  type: string;
  rarity: string;
  level: number;
  tokenId: string;
  timestamp: number;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    specialAttack: number;
    specialDefense: number;
  };
}

// Context value type
interface MarketplaceContextType {
  pokemons: Pokemon[];
  setPokemons: React.Dispatch<React.SetStateAction<Pokemon[]>>;
}

// Create context
export const MarketplaceContext = createContext<MarketplaceContextType>({
  pokemons: [],
  setPokemons: () => {},
});

// Provider component
interface MarketplaceProviderProps {
  children: ReactNode;
}

export const MarketplaceProvider: React.FC<MarketplaceProviderProps> = ({
  children,
}) => {
  const [pokemons, setPokemons] = useState<Pokemon[]>([]);

  return (
    <MarketplaceContext.Provider value={{ pokemons, setPokemons }}>
      {children}
    </MarketplaceContext.Provider>
  );
};
