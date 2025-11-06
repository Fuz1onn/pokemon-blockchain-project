// src/data/pokemonData.ts

export interface Pokemon {
  tokenId: string; // Unique blockchain-style ID
  name: string;
  type: string;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  image: string;
  price: number;
  level: number;
  owner?: string; // Wallet address of owner (optional)
}

// Base Pokémon pool (templates)
export const pokemonPool: Omit<Pokemon, "tokenId" | "level" | "owner">[] = [
  {
    name: "Pikachu",
    type: "Electric",
    rarity: "Rare",
    image: "/assets/pokemons/pikachu.gif",
    price: 80,
  },
  {
    name: "Charmander",
    type: "Fire",
    rarity: "Common",
    image: "/assets/pokemons/charmander.gif",
    price: 50,
  },
  {
    name: "Bulbasaur",
    type: "Grass",
    rarity: "Common",
    image: "/assets/pokemons/bulbasaur.gif",
    price: 50,
  },
  {
    name: "Squirtle",
    type: "Water",
    rarity: "Common",
    image: "/assets/pokemons/squirtle.gif",
    price: 50,
  },
  {
    name: "Eevee",
    type: "Normal",
    rarity: "Rare",
    image: "/assets/pokemons/eevee.gif",
    price: 80,
  },
  {
    name: "Gengar",
    type: "Ghost",
    rarity: "Epic",
    image: "/assets/pokemons/gengar.gif",
    price: 120,
  },
  {
    name: "Mewtwo",
    type: "Psychic",
    rarity: "Legendary",
    image: "/assets/pokemons/mewtwo.gif",
    price: 200,
  },
  {
    name: "Arcanine",
    type: "Fire",
    rarity: "Epic",
    image: "/assets/pokemons/arcanine.gif",
    price: 130,
  },
  {
    name: "Dragonite",
    type: "Dragon",
    rarity: "Legendary",
    image: "/assets/pokemons/dragonite.gif",
    price: 220,
  },
];
