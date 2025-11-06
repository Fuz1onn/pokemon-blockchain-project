import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React, { useState } from "react";
import { Link } from "react-router-dom";

import { Pencil } from "lucide-react";
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
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState("");

  const shortenAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        {/* Left: Wallet info + Profile Name */}
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold">
              Trainer: {profileName || shortenAddress(account)}
            </h2>
            <button
              onClick={() => setIsEditing(true)}
              className="text-gray-400 hover:text-yellow-400 transition"
            >
              <Pencil size={18} />
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-1">Coins: {coinBalance}</p>
        </div>

        {/* Middle: Navigation */}
        <div className="flex space-x-6 text-lg font-semibold">
          <Link to="/marketplace" className="hover:text-yellow-400 transition">
            Marketplace
          </Link>
          <Link to="/mypokemon" className="hover:text-yellow-400 transition">
            Pokémon
          </Link>
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
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>

        {/* Edit Name Modal */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="bg-gray-900 border border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Edit Trainer Name</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <Input
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="Enter new trainer name"
                className="text-white"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  if (tempName.trim()) {
                    setProfileName(tempName.trim());
                    setTempName("");
                    setIsEditing(false);
                  }
                }}
                className="text-neutral-950 hover:opacity-80 transition"
              >
                Save changes
              </Button>
              <Button
                onClick={() => setIsEditing(false)}
                className="bg-neutral-900 text-gray-300 border border-gray-600 hover:bg-neutral-800 transition"
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Welcome Banner */}
      <div
        className="relative text-center mb-6 p-8 rounded-2xl overflow-hidden shadow-lg"
        style={{
          backgroundImage: `url(${arenaBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Overlay for readability */}
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
