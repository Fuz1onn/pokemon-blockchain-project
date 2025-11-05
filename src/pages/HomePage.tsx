import React, { useState } from "react";

interface Pokemon {
  id: number;
  name: string;
  image: string;
  level: number;
}

interface HomePageProps {
  account: string;
  ownedPokemons: Pokemon[];
  coinBalance: number;
  onStartMatch: () => void;
  onLogout: () => void;
  canStartMatch: boolean;
}

const HomePage: React.FC<HomePageProps> = ({
  account,
  ownedPokemons,
  coinBalance,
  onStartMatch,
  onLogout,
  canStartMatch,
}) => {
  // Profile name state
  const [profileName, setProfileName] = useState<string | null>(null);
  const [tempName, setTempName] = useState<string>("");

  const shortenAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        {/* Left: Wallet info + Profile Name */}
        <div>
          <h2 className="text-2xl font-bold">
            Trainer: {profileName || shortenAddress(account)}
          </h2>

          {/* Edit profile name input */}
          {!profileName && (
            <div className="flex items-center mt-1 space-x-2">
              <input
                type="text"
                placeholder="Enter your trainer name"
                className="px-3 py-1 rounded-lg text-black text-sm"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
              />
              <button
                onClick={() => {
                  if (tempName.trim()) {
                    setProfileName(tempName.trim());
                    setTempName("");
                  }
                }}
                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                Save
              </button>
            </div>
          )}
        </div>

        {/* Right: Notifications + Seasonal Banner + Logout */}
        <div className="flex items-center space-x-4">
          {/* Notification Bell */}
          <button className="relative">
            <svg
              className="w-6 h-6 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
            </svg>
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Seasonal / Theme Icon */}
          <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
            <span className="text-gray-900 font-bold text-lg">⚡</span>
            {/* Replace ⚡ with seasonal icon or small Pokéball */}
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="text-center mb-6 animate-pulse">
        <h2 className="text-3xl font-bold text-yellow-400 mb-2">
          Welcome, Trainer!
        </h2>
        <p className="text-gray-300">
          You have {ownedPokemons.length} Pokémon ready to battle.
        </p>
      </div>

      {/* Start Match */}
      <div className="text-center mb-8">
        <button
          onClick={onStartMatch}
          disabled={!canStartMatch}
          className={`px-6 py-3 rounded-lg text-xl font-bold transition ${
            canStartMatch
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-600 cursor-not-allowed"
          }`}
        >
          {canStartMatch
            ? "Start Match"
            : "You need at least 3 Pokémon to start"}
        </button>
      </div>

      {/* Owned Pokémons */}
      <div className="mb-8">
        <h3 className="text-xl font-bold mb-4">Your Pokémons</h3>
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
