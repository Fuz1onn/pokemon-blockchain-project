import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

interface Pokemon {
  id: number;
  name: string;
  image: string;
  type: string;
  rarity: string;
  price: number;
  tokenId: string;
  level: number;
  timestamp: number; // for sorting "Latest"
}

const getRandomRarity = (): string => {
  const roll = Math.random();
  if (roll < 0.05) return "Legendary";
  if (roll < 0.15) return "Epic";
  if (roll < 0.35) return "Rare";
  return "Common";
};

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case "Legendary":
      return "text-yellow-400";
    case "Epic":
      return "text-purple-400";
    case "Rare":
      return "text-blue-400";
    default:
      return "text-green-400";
  }
};

const MarketplacePage: React.FC = () => {
  const [pokemons, setPokemons] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: "All",
    rarity: "All",
    level: "All",
    price: "All",
    latest: "Default",
  });

  const fetchRandomPokemons = async (count = 9) => {
    setLoading(true);
    const fetched: Pokemon[] = [];

    const randomIds = Array.from(
      { length: count },
      () => Math.floor(Math.random() * 151) + 1
    );

    for (const id of randomIds) {
      try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        const data = await res.json();

        const rarity = getRandomRarity();
        const level = Math.floor(Math.random() * 30) + 1;
        const price =
          rarity === "Legendary"
            ? 500
            : rarity === "Epic"
            ? 250
            : rarity === "Rare"
            ? 100
            : 50;

        fetched.push({
          id: data.id,
          name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
          image: data.sprites.other["official-artwork"].front_default,
          type: data.types[0].type.name,
          rarity,
          price,
          tokenId: uuidv4(),
          level,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error("Error fetching Pokémon:", err);
      }
    }

    setPokemons((prev) => [...prev, ...fetched]);
    setLoading(false);
  };

  useEffect(() => {
    fetchRandomPokemons();
  }, []);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
          document.body.offsetHeight - 200 &&
        !loading
      ) {
        fetchRandomPokemons(6); // load more on scroll
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading]);

  const handleBuy = (pokemon: Pokemon) => {
    alert(
      `You bought ${pokemon.name} (${
        pokemon.rarity
      }) — Token ID: ${pokemon.tokenId.slice(0, 6)}...`
    );
    // TODO: integrate blockchain buy/mint logic
  };

  const handleRefresh = () => {
    setPokemons([]);
    fetchRandomPokemons();
  };

  // Apply filters
  const filteredPokemons = pokemons
    .filter((p) => {
      const { type, rarity, level, price } = filters;
      let valid = true;

      if (type !== "All" && p.type !== type.toLowerCase()) valid = false;
      if (rarity !== "All" && p.rarity !== rarity) valid = false;

      if (level !== "All") {
        if (level === "1-10" && !(p.level >= 1 && p.level <= 10)) valid = false;
        if (level === "11-20" && !(p.level >= 11 && p.level <= 20))
          valid = false;
        if (level === "21-30" && !(p.level >= 21 && p.level <= 30))
          valid = false;
      }

      if (price !== "All") {
        if (price === "<80" && p.price >= 80) valid = false;
        if (price === "80-150" && !(p.price >= 80 && p.price <= 150))
          valid = false;
        if (price === ">150" && p.price <= 150) valid = false;
      }

      return valid;
    })
    .sort((a, b) =>
      filters.latest === "Latest" ? b.timestamp - a.timestamp : 0
    );

  if (loading && pokemons.length === 0)
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <p>Loading Pokémon...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-yellow-400">Marketplace</h2>
        <button
          onClick={handleRefresh}
          className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold hover:bg-yellow-400 transition"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="bg-gray-800 border border-gray-600 rounded-lg p-2 text-white"
        >
          <option value="All">All Types</option>
          <option value="fire">Fire</option>
          <option value="water">Water</option>
          <option value="grass">Grass</option>
          <option value="electric">Electric</option>
          <option value="psychic">Psychic</option>
          <option value="normal">Normal</option>
          <option value="ghost">Ghost</option>
          <option value="dragon">Dragon</option>
        </select>

        <select
          value={filters.rarity}
          onChange={(e) => setFilters({ ...filters, rarity: e.target.value })}
          className="bg-gray-800 border border-gray-600 rounded-lg p-2 text-white"
        >
          <option value="All">All Rarities</option>
          <option value="Common">Common</option>
          <option value="Rare">Rare</option>
          <option value="Epic">Epic</option>
          <option value="Legendary">Legendary</option>
        </select>

        <select
          value={filters.level}
          onChange={(e) => setFilters({ ...filters, level: e.target.value })}
          className="bg-gray-800 border border-gray-600 rounded-lg p-2 text-white"
        >
          <option value="All">All Levels</option>
          <option value="1-10">Level 1–10</option>
          <option value="11-20">Level 11–20</option>
          <option value="21-30">Level 21–30</option>
        </select>

        <select
          value={filters.price}
          onChange={(e) => setFilters({ ...filters, price: e.target.value })}
          className="bg-gray-800 border border-gray-600 rounded-lg p-2 text-white"
        >
          <option value="All">All Prices</option>
          <option value="<80">Below 80</option>
          <option value="80-150">80–150</option>
          <option value=">150">Above 150</option>
        </select>

        <select
          value={filters.latest}
          onChange={(e) => setFilters({ ...filters, latest: e.target.value })}
          className="bg-gray-800 border border-gray-600 rounded-lg p-2 text-white"
        >
          <option value="Default">Default</option>
          <option value="Latest">Latest</option>
        </select>
      </div>

      {/* Pokémon Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredPokemons.map((pokemon) => (
          <div
            key={pokemon.tokenId}
            className="relative bg-gray-800 p-4 rounded-lg text-center shadow-md group hover:shadow-lg transition duration-300"
          >
            <img
              src={pokemon.image}
              alt={pokemon.name}
              className="mx-auto mb-3 w-32 h-32 object-contain"
            />
            <h4 className="font-semibold text-xl">{pokemon.name}</h4>
            <p className="capitalize text-gray-300">{pokemon.type} type</p>
            <p className={`${getRarityColor(pokemon.rarity)} font-bold`}>
              {pokemon.rarity}
            </p>
            <p className="text-gray-400">Level {pokemon.level}</p>
            <p className="mt-2 text-gray-400">{pokemon.price} Coins</p>

            <button
              onClick={() => handleBuy(pokemon)}
              className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center text-yellow-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
            >
              Buy Now
            </button>
          </div>
        ))}
      </div>

      {loading && (
        <p className="text-center text-gray-400 mt-6">
          Loading more Pokémon...
        </p>
      )}
    </div>
  );
};

export default MarketplacePage;
