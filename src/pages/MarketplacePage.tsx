import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { calculateEthPrice } from "../utils/price";
import { FaEthereum } from "react-icons/fa";

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
  stats: Stats;
}

interface Stats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  specialAttack: number;
  specialDefense: number;
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

const typeColors: Record<string, string> = {
  Fire: "text-red-400",
  Water: "text-blue-400",
  Grass: "text-green-400",
  Electric: "text-yellow-300",
  Psychic: "text-purple-400",
  Normal: "text-gray-300",
  Ghost: "text-indigo-400",
  Dragon: "text-orange-400",
  Ice: "text-cyan-300",
  Rock: "text-stone-400",
  Ground: "text-amber-600",
  Poison: "text-purple-700",
  Bug: "text-lime-400",
  Dark: "text-gray-700",
  Steel: "text-slate-400",
  Fighting: "text-red-700",
  Fairy: "text-pink-400",
  Flying: "text-sky-300",
};

const MarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const [pokemons, setPokemons] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: "All",
    rarity: "All",
    level: "All",
    price: "All",
    latest: "Default",
  });

  // Generate stats based on level & rarity
  const generateStats = (level: number, rarity: string): Stats => {
    const base =
      {
        Common: 40,
        Rare: 60,
        Epic: 80,
        Legendary: 100,
      }[rarity] ?? 40; // fallback to 40

    const variation = 10;

    const randomStat = () =>
      Math.floor(base + Math.random() * variation + level * 2);

    return {
      hp: randomStat(),
      attack: randomStat(),
      defense: randomStat(),
      speed: randomStat(),
      specialAttack: randomStat(),
      specialDefense: randomStat(),
    };
  };

  const fetchRandomPokemons = async (count = 8) => {
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

        const stats = generateStats(level, rarity);

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
          stats,
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
    const ethPrice = calculateEthPrice(pokemon.rarity, pokemon.level);
    alert(
      `You bought ${pokemon.name} (${
        pokemon.rarity
      }) for Ξ ${ethPrice} — Token ID: ${pokemon.tokenId.slice(0, 6)}...`
    );
    // TODO: integrate blockchain buy/mint logic
  };

  const handleCardClick = (pokemon: Pokemon) => {
    navigate(`/marketplace/${pokemon.tokenId}`, { state: { pokemon } });
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
        {filteredPokemons.map((pokemon) => {
          const rarityGlow = {
            Legendary:
              "ring-2 ring-yellow-400 shadow-[0_0_20px_3px_rgba(250,204,21,0.6)] animate-legendary",
            Epic: "ring-2 ring-purple-500 shadow-[0_0_18px_3px_rgba(168,85,247,0.6)]",
            Rare: "ring-2 ring-blue-400 shadow-[0_0_12px_3px_rgba(59,130,246,0.6)]",
            Common:
              "ring-1 ring-green-400 shadow-[0_0_10px_2px_rgba(74,222,128,0.5)]",
          }[pokemon.rarity];

          return (
            <div
              key={pokemon.tokenId}
              className={`group bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-transform transform hover:-translate-y-1 relative ${rarityGlow}`}
            >
              {/* Pokémon Image Section */}
              <div
                className="relative bg-gradient-to-b from-gray-100 to-gray-300 flex justify-center items-center p-6"
                onClick={() => handleCardClick(pokemon)}
              >
                {/* Level Badge */}
                <span className="absolute top-2 left-2 bg-yellow-500 text-black font-bold text-xs px-2 py-1 rounded-full shadow-md">
                  Lv. {pokemon.level}
                </span>

                <img
                  src={pokemon.image}
                  alt={pokemon.name}
                  className="w-44 h-44 object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Pokémon Details Section */}
              <div className="bg-gradient-to-b from-gray-700 to-gray-800 p-4 border-t border-gray-700 relative text-left transition-all duration-300 group-hover:-translate-y-10">
                {/* Element + Token ID */}
                <p className="mb-1 inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-white/10 border border-white/20">
                  <span
                    className={`capitalize font-semibold ${
                      typeColors[
                        pokemon.type.charAt(0).toUpperCase() +
                          pokemon.type.slice(1)
                      ] || "text-white"
                    }`}
                  >
                    {pokemon.type}
                  </span>
                  <span className="text-gray-300 font-mono">
                    #{pokemon.tokenId.slice(0, 6)}...
                  </span>
                </p>

                {/* Rarity + Pokémon Name */}
                <h4 className="font-bold text-lg mb-1">
                  <span className={`${getRarityColor(pokemon.rarity)} mr-1`}>
                    {pokemon.rarity}
                  </span>
                  <span className="text-white">{pokemon.name}</span>
                </h4>

                {/* Price */}
                <p className="text-yellow-400 font-bold text-lg mt-1 flex items-center gap-2">
                  <FaEthereum />{" "}
                  {calculateEthPrice(pokemon.rarity, pokemon.level)}
                </p>

                {/* Hover Buy Button */}
                <div className="absolute bottom-4 left-0 right-0 px-4 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-11 transition-all duration-300">
                  <button
                    onClick={() => handleBuy(pokemon)}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-2 px-4 rounded-lg transition"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          );
        })}
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
