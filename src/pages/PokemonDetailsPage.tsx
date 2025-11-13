import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Move } from "../utils/pokemonSkills";
import { pokemonSkills } from "../utils/pokemonSkills";
import ForestBg from "../assets/background/forest.jpg";
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
  timestamp: number;
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

const typeColors: Record<string, string> = {
  Fire: "from-red-500/30 to-red-700/20 border-red-400 text-red-300",
  Water: "from-blue-500/30 to-blue-700/20 border-blue-400 text-blue-300",
  Grass: "from-green-500/30 to-green-700/20 border-green-400 text-green-300",
  Electric:
    "from-yellow-400/30 to-yellow-600/20 border-yellow-300 text-yellow-200",
  Psychic:
    "from-purple-500/30 to-purple-700/20 border-purple-400 text-purple-300",
  Normal: "from-gray-500/30 to-gray-700/20 border-gray-400 text-gray-300",
  Ghost:
    "from-indigo-500/30 to-indigo-700/20 border-indigo-400 text-indigo-300",
  Dragon:
    "from-orange-500/30 to-orange-700/20 border-orange-400 text-orange-300",
  Ice: "from-cyan-400/30 to-cyan-600/20 border-cyan-300 text-cyan-200",
  Rock: "from-stone-500/30 to-stone-700/20 border-stone-400 text-stone-300",
  Ground: "from-amber-600/30 to-amber-800/20 border-amber-500 text-amber-300",
  Poison:
    "from-purple-700/30 to-purple-900/20 border-purple-600 text-purple-300",
  Bug: "from-lime-500/30 to-lime-700/20 border-lime-400 text-lime-300",
  Dark: "from-gray-800/40 to-gray-900/30 border-gray-700 text-gray-400",
  Steel: "from-slate-500/30 to-slate-700/20 border-slate-400 text-slate-300",
  Fighting: "from-red-700/30 to-red-900/20 border-red-700 text-red-300",
  Fairy: "from-pink-400/30 to-pink-600/20 border-pink-400 text-pink-200",
  Flying: "from-sky-400/30 to-sky-600/20 border-sky-400 text-sky-200",
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

const generateStats = (rarity: string, level: number) => {
  const variation = 10;
  const base =
    {
      Common: 40,
      Rare: 60,
      Epic: 80,
      Legendary: 100,
    }[rarity] ?? 40;

  return {
    hp: Math.floor(base + Math.random() * variation + level * 2),
    attack: Math.floor(base + Math.random() * variation + level * 2),
    defense: Math.floor(base + Math.random() * variation + level * 2),
    speed: Math.floor(base + Math.random() * variation + level * 2),
  };
};

const PokemonDetailsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pokemon = location.state?.pokemon as Pokemon;

  if (!pokemon) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <p>Pokémon data not found.</p>
      </div>
    );
  }

  const stats = generateStats(pokemon.rarity, pokemon.level);
  const moves: Move[] = pokemonSkills[pokemon.name] || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition cursor-pointer"
      >
        &larr; Back to Marketplace
      </button>

      <div className="flex flex-col md:flex-row gap-10">
        {/* Pokémon Image */}
        <div className="flex-shrink-0 relative w-64 rounded-2xl shadow-xl flex justify-center items-center overflow-hidden">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${ForestBg})` }}
          ></div>

          {/* Optional Overlay for better contrast */}
          <div className="absolute inset-0 bg-black/20"></div>

          {/* Pokémon Sprite */}
          <img
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${pokemon.id}.gif`}
            alt={pokemon.name}
            className="relative w-54 h-54 object-contain drop-shadow-2xl"
          />
        </div>

        {/* Pokémon Info */}
        <div className="flex-1 space-y-6">
          {/* Pokémon Info Panel */}
          <div className="bg-gray-800/60 p-6 rounded-2xl shadow-xl flex flex-col gap-5">
            {/* Name + Rarity */}
            <div className="flex items-center gap-4">
              <span
                className={`text-3xl font-extrabold ${getRarityColor(
                  pokemon.rarity
                )}`}
              >
                {pokemon.rarity}
              </span>
              <h2 className="text-3xl font-bold tracking-wide">
                {pokemon.name}
              </h2>
            </div>

            {/* Type + Token ID + Level */}
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`capitalize font-semibold px-3 py-1 rounded-md border ${
                  typeColors[
                    pokemon.type.charAt(0).toUpperCase() + pokemon.type.slice(1)
                  ]?.split(" ")[2] || "border-white text-white"
                } border-opacity-40`}
              >
                {pokemon.type}
              </span>
              <span className="text-gray-400 font-mono px-2 py-1 rounded border border-white/10">
                #{pokemon.tokenId}
              </span>
              <span className="inline-block bg-yellow-400 text-black font-bold px-3 py-1 rounded-full">
                Lv. {pokemon.level}
              </span>
            </div>

            <div className="flex items-center gap-4 mt-3">
              {/* Price */}
              <p className="text-yellow-400 font-bold text-xl flex items-center gap-2">
                <FaEthereum />{" "}
                {calculateEthPrice(pokemon.rarity, pokemon.level)}
              </p>

              {/* Buy Button */}
              <button
                onClick={() => handleBuy(pokemon)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-bold py-2 px-5 rounded-xl shadow-md hover:from-yellow-600 hover:to-yellow-700 transition transform cursor-pointer"
              >
                Buy Now
              </button>
            </div>
          </div>

          {/* Stats */}
          <div
            className={`bg-gray-800/60 p-6 rounded-2xl shadow-md grid grid-cols-2 sm:grid-cols-4 gap-6`}
          >
            {Object.entries(stats).map(([key, value]) => (
              <div
                key={key}
                className="text-center p-3 rounded-lg bg-gray-900/50 border border-white/10"
              >
                <p className="uppercase text-gray-400 text-sm tracking-wider font-medium">
                  {key}
                </p>
                <p className="text-2xl font-extrabold text-yellow-400">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Moves Section */}
          <div>
            <h3 className="text-2xl font-semibold mb-3">Moves</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {moves.length > 0 ? (
                moves.map((move) => {
                  const type =
                    move.type.charAt(0).toUpperCase() + move.type.slice(1);
                  const typeColor =
                    typeColors[type] ||
                    "from-gray-700/40 to-gray-900/20 border-gray-700 text-white";

                  const typeAccent =
                    {
                      Fire: "bg-red-500",
                      Water: "bg-blue-500",
                      Grass: "bg-green-500",
                      Electric: "bg-yellow-400",
                      Psychic: "bg-purple-500",
                      Normal: "bg-gray-400",
                      Bug: "bg-lime-500",
                      Flying: "bg-sky-400",
                      Ground: "bg-amber-600",
                      Rock: "bg-stone-600",
                      Ice: "bg-cyan-400",
                      Dark: "bg-gray-700",
                      Fairy: "bg-pink-400",
                      Dragon: "bg-orange-500",
                      Poison: "bg-purple-700",
                      Steel: "bg-slate-400",
                      Fighting: "bg-red-700",
                    }[type] || "bg-gray-500";

                  const currentPP = move.pp;

                  return (
                    <div
                      key={move.name}
                      className={`relative border-2 ${typeColor} bg-gradient-to-b rounded-xl overflow-hidden hover:translate-y-[-2px] transition-transform duration-200 shadow-[0_4px_0_rgba(255,255,255,0.05)]`}
                    >
                      {/* Colored Accent Bar */}
                      <div
                        className={`absolute top-0 left-0 w-1.5 h-full ${typeAccent}`}
                      ></div>

                      {/* Move Header */}
                      <div className="px-4 py-2 bg-black/30 border-b border-white/10 flex justify-between items-center">
                        <span className="font-extrabold tracking-wide text-lg">
                          {move.name}
                        </span>
                        <span
                          className={`capitalize px-2 py-0.5 rounded text-xs font-bold ${typeAccent} text-black`}
                        >
                          {move.type}
                        </span>
                      </div>

                      {/* Move Stats */}
                      <div className="px-4 py-3 font-mono text-sm text-gray-300 space-y-1">
                        <div className="flex justify-between">
                          <span>⚔ Power</span>
                          <span>{move.power}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>🎯 Accuracy</span>
                          <span>{move.accuracy}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>🔋 PP</span>
                          <span>
                            {currentPP}/{move.pp}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-400">No moves available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PokemonDetailsPage;
