import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import arenaBg from "../assets/background/arena.png";

interface Pokemon {
  id: number;
  name: string;
  image: string;
  level: number;
}

interface HomePageProps {
  account: string;
  ownedPokemons: Pokemon[];
  leelasBalance: number;
  onStartMatch: () => void;
  onLogout: () => void;
  canStartMatch: boolean;
}

const HomePage: React.FC<HomePageProps> = ({
  ownedPokemons,
  onStartMatch,
  canStartMatch,
}) => {
  return (
    <div className="text-white">
      {/* Welcome Banner */}
      <div
        className="relative text-center mb-6 p-8 rounded-2xl overflow-hidden shadow-lg"
        style={{
          backgroundImage: `url(${arenaBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Banner content */}
        <div className="relative z-10 space-y-4">
          <h2 className="text-4xl font-bold text-yellow-400 mt-8 animate-pulse drop-shadow-lg">
            Welcome, Trainer!
          </h2>
          <p className="text-gray-200">
            You have {ownedPokemons.length} Pokémon ready to battle.
          </p>

          <button
            onClick={onStartMatch}
            disabled={!canStartMatch}
            className={`mb-8 mt-4 px-6 py-3 rounded-lg text-xl font-bold transition duration-200 ${
              canStartMatch
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-gray-600 text-gray-300 cursor-not-allowed"
            }`}
          >
            {canStartMatch
              ? "Start Match"
              : "You need at least 3 Pokémon to start"}
          </button>
        </div>
      </div>

      {/* Owned Pokémons */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <h3 className="text-xl font-bold">Your Pokémons</h3>
          <Link
            to="/mypokemon"
            className="flex items-center text-yellow-400 hover:text-yellow-300 text-md font-semibold transition"
          >
            See more <ChevronRight size={16} className="ml-1" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {ownedPokemons.map((pokemon) => (
            <div
              key={pokemon.id}
              className="bg-gray-800 p-4 rounded-lg text-center shadow-md"
            >
              <img
                src={pokemon.image}
                alt={pokemon.name}
                className="mx-auto mb-2 w-24 h-24"
              />
              <h4 className="font-semibold">{pokemon.name}</h4>
              <p>Level: {pokemon.level}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div>
        <h3 className="text-xl font-bold mb-4">Leaderboard</h3>
        <div className="bg-gray-800 p-4 rounded-lg shadow-md">
          <p>Leaderboard data will go here...</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
