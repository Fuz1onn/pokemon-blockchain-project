import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import type { Move } from "../utils/pokemonSkills";
import { pokemonSkills } from "../utils/pokemonSkills";
import ForestBg from "../assets/background/forest.jpg";
import {
  FaEthereum,
  FaArrowLeft,
  FaShoppingCart,
  FaBolt,
  FaUsers,
} from "react-icons/fa";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  mintAndBuyPokemon,
  buyListedPokemon,
  checkNetwork,
} from "../contracts/contractUtils";

interface Stats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  specialAttack?: number;
  specialDefense?: number;
}

interface GeneratedPokemon {
  id: number;
  name: string;
  image: string;
  type: string;
  rarity: string;
  price: number;
  ethPrice: number;
  tempId: string;
  level: number;
  timestamp: number;
  stats: Stats;
  metadataUri?: string;
}

interface MintedPokemon {
  id: number;
  name: string;
  image: string;
  type: string;
  rarity: string;
  price: number;
  ethPrice: number;
  tokenId: number;
  level: number;
  timestamp: number;
  stats: Stats;
  seller: string;
  isListed: boolean;
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

const PokemonDetailsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { pokemon, source } = location.state as {
    pokemon: GeneratedPokemon | MintedPokemon;
    source: "general" | "listings";
  };

  const [buying, setBuying] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);

  if (!pokemon) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <p>Pokémon data not found.</p>
      </div>
    );
  }

  const moves: Move[] = pokemonSkills[pokemon.name] || [];
  const isDailyDrop = "tempId" in pokemon;

  const handleBuyConfirm = async () => {
    try {
      setBuying(true);
      await checkNetwork();

      if (isDailyDrop) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const userAddress = await signer.getAddress();

        const result = await mintAndBuyPokemon(
          userAddress,
          (pokemon as GeneratedPokemon).metadataUri!,
          pokemon.ethPrice
        );

        if (result.success) {
          alert(
            `✅ Successfully minted ${pokemon.name}!\n\nToken ID: ${
              result.tokenId
            }\nTransaction: ${result.transactionHash.slice(0, 10)}...`
          );
          navigate("/marketplace");
        }
      } else {
        const result = await buyListedPokemon(
          (pokemon as MintedPokemon).tokenId,
          pokemon.ethPrice
        );

        if (result.success) {
          alert(`✅ Successfully purchased ${pokemon.name}!`);
          navigate("/marketplace");
        }
      }
    } catch (error: any) {
      console.error("Purchase failed:", error);
      alert(`❌ Purchase failed: ${error.message}`);
    } finally {
      setBuying(false);
      setShowBuyModal(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
      >
        <FaArrowLeft />
        Back to Marketplace
      </button>

      {/* Source Badge */}
      <div className="mb-4 flex items-center gap-2">
        {isDailyDrop ? (
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-400 text-sm font-semibold">
            <FaBolt /> Daily Drop • Fresh Stock
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-400 text-sm font-semibold">
            <FaUsers /> Community Market • Player Owned
          </span>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-10">
        {/* Pokémon Image */}
        <div className="flex-shrink-0 relative w-full md:w-80 rounded-2xl shadow-xl flex justify-center items-center overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${ForestBg})` }}
          ></div>
          <div className="absolute inset-0 bg-black/20"></div>

          <img
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${pokemon.id}.gif`}
            alt={pokemon.name}
            className="relative w-48 h-48 object-contain drop-shadow-2xl z-10"
          />

          <div className="absolute top-4 left-4 z-20">
            <span
              className={`px-4 py-2 rounded-full text-sm font-bold bg-black/70 ${getRarityColor(
                pokemon.rarity
              )}`}
            >
              {pokemon.rarity}
            </span>
          </div>

          <div className="absolute top-4 right-4 z-20">
            <span className="px-4 py-2 rounded-full text-sm font-bold bg-yellow-500 text-black">
              Level {pokemon.level}
            </span>
          </div>
        </div>

        {/* Pokémon Info */}
        <div className="flex-1 space-y-6">
          <div className="bg-gray-800/60 p-6 rounded-2xl shadow-xl flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <h2 className="text-4xl font-bold tracking-wide">
                {pokemon.name}
              </h2>
            </div>

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
                {isDailyDrop
                  ? `#${(pokemon as GeneratedPokemon).tempId.slice(0, 8)}...`
                  : `#${(pokemon as MintedPokemon).tokenId}`}
              </span>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-4 mt-3 p-4 bg-black/30 rounded-lg">
              <div>
                <p className="text-gray-400 text-sm mb-1">Price</p>
                <p className="text-yellow-400 font-bold text-2xl flex items-center gap-2">
                  <FaEthereum /> {pokemon.ethPrice}
                </p>
                <span className="text-gray-400 text-sm">~${pokemon.price}</span>
              </div>

              <button
                onClick={() => setShowBuyModal(true)}
                disabled={buying}
                className={`inline-flex items-center gap-2 ${
                  buying
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-600 hover:to-yellow-700"
                } text-black font-bold py-3 px-6 rounded-xl shadow-md transition transform`}
              >
                <FaShoppingCart />
                {buying
                  ? "Processing..."
                  : isDailyDrop
                  ? "Mint & Buy Now"
                  : "Buy Now"}
              </button>
            </div>

            {isDailyDrop && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
                <p className="text-yellow-400">
                  💡 <strong>Daily Drop:</strong> This Pokémon will be minted as
                  an NFT when you purchase it. Includes +20% marketplace
                  convenience fee.
                </p>
              </div>
            )}

            {!isDailyDrop && (pokemon as MintedPokemon).seller && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
                <p className="text-blue-400">
                  👤 <strong>Seller:</strong>{" "}
                  {(pokemon as MintedPokemon).seller.slice(0, 6)}...
                  {(pokemon as MintedPokemon).seller.slice(-4)}
                </p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="bg-gray-800/60 p-6 rounded-2xl shadow-md">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              📊 Base Stats
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-red-500/20 to-red-700/10 border border-red-500/30">
                <p className="uppercase text-gray-400 text-xs tracking-wider font-medium mb-1">
                  HP
                </p>
                <p className="text-3xl font-extrabold text-red-400">
                  {pokemon.stats.hp}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-700/10 border border-orange-500/30">
                <p className="uppercase text-gray-400 text-xs tracking-wider font-medium mb-1">
                  Attack
                </p>
                <p className="text-3xl font-extrabold text-orange-400">
                  {pokemon.stats.attack}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-700/10 border border-blue-500/30">
                <p className="uppercase text-gray-400 text-xs tracking-wider font-medium mb-1">
                  Defense
                </p>
                <p className="text-3xl font-extrabold text-blue-400">
                  {pokemon.stats.defense}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-700/10 border border-yellow-500/30">
                <p className="uppercase text-gray-400 text-xs tracking-wider font-medium mb-1">
                  Speed
                </p>
                <p className="text-3xl font-extrabold text-yellow-400">
                  {pokemon.stats.speed}
                </p>
              </div>
              {pokemon.stats.specialAttack && (
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-700/10 border border-purple-500/30">
                  <p className="uppercase text-gray-400 text-xs tracking-wider font-medium mb-1">
                    Sp. Atk
                  </p>
                  <p className="text-3xl font-extrabold text-purple-400">
                    {pokemon.stats.specialAttack}
                  </p>
                </div>
              )}
              {pokemon.stats.specialDefense && (
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-500/20 to-green-700/10 border border-green-500/30">
                  <p className="uppercase text-gray-400 text-xs tracking-wider font-medium mb-1">
                    Sp. Def
                  </p>
                  <p className="text-3xl font-extrabold text-green-400">
                    {pokemon.stats.specialDefense}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Moves Section */}
          <div>
            <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              ⚔️ Move Set
            </h3>
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

                  return (
                    <div
                      key={move.name}
                      className={`relative border-2 ${typeColor} bg-gradient-to-b rounded-xl overflow-hidden hover:translate-y-[-2px] transition-transform duration-200 shadow-[0_4px_0_rgba(255,255,255,0.05)]`}
                    >
                      <div
                        className={`absolute top-0 left-0 w-1.5 h-full ${typeAccent}`}
                      ></div>

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

                      <div className="px-4 py-3 font-mono text-sm text-gray-300 space-y-1">
                        <div className="flex justify-between">
                          <span>⚔️ Power</span>
                          <span className="font-bold">{move.power}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>🎯 Accuracy</span>
                          <span className="font-bold">{move.accuracy}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>🔋 PP</span>
                          <span className="font-bold">
                            {move.pp}/{move.pp}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-400 col-span-2">
                  No moves available for this Pokémon
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Buy Confirmation Modal */}
      <Dialog open={showBuyModal} onOpenChange={setShowBuyModal}>
        <DialogContent className="bg-gray-900 border border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-4">
              <img
                src={pokemon.image}
                alt={pokemon.name}
                className="w-20 h-20 object-contain"
              />
              <div>
                <h3 className="text-xl font-bold">{pokemon.name}</h3>
                <p className={`text-sm ${getRarityColor(pokemon.rarity)}`}>
                  {pokemon.rarity}
                </p>
                <p className="text-sm text-gray-400">Level {pokemon.level}</p>
              </div>
            </div>

            <div className="p-4 bg-black/30 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Source:</span>
                {isDailyDrop ? (
                  <span className="text-yellow-400 font-semibold flex items-center gap-1">
                    <FaBolt /> Daily Drop
                  </span>
                ) : (
                  <span className="text-blue-400 font-semibold flex items-center gap-1">
                    <FaUsers /> Community Market
                  </span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Price:</span>
                <span className="text-yellow-400 font-bold flex items-center gap-1">
                  <FaEthereum /> {pokemon.ethPrice} (~${pokemon.price})
                </span>
              </div>
              {!isDailyDrop && (pokemon as MintedPokemon).seller && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Seller:</span>
                  <span className="text-white font-mono text-sm">
                    {(pokemon as MintedPokemon).seller.slice(0, 6)}...
                    {(pokemon as MintedPokemon).seller.slice(-4)}
                  </span>
                </div>
              )}
            </div>

            <p className="text-sm text-gray-400">
              {isDailyDrop
                ? "This will create a blockchain transaction to mint this Pokémon NFT."
                : "This will transfer the NFT to your wallet."}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBuyModal(false)}
              className="bg-neutral-900 text-gray-300 border border-gray-600 hover:bg-neutral-800 transition"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBuyConfirm}
              disabled={buying}
              className="bg-yellow-500 text-black hover:bg-yellow-400 transition"
            >
              {buying ? "Processing..." : "Confirm Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PokemonDetailsPage;
