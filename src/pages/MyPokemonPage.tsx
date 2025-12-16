import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { FaEthereum, FaBolt, FaUsers } from "react-icons/fa";
import contractAddress from "../contracts/contract-address.json";

interface Stats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  specialAttack?: number;
  specialDefense?: number;
}

interface OwnedPokemon {
  id: number;
  name: string;
  image: string;
  type: string;
  rarity: string;
  level: number;
  stats: Stats;
  tokenId: number;
  purchasedAt?: number;
}

const CONTRACT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "event PokemonMinted(uint256 indexed tokenId, address indexed owner, string tokenURI)",
];

const typeColors: Record<string, string> = {
  fire: "text-red-400",
  water: "text-blue-400",
  grass: "text-green-400",
  electric: "text-yellow-300",
  psychic: "text-purple-400",
  normal: "text-gray-300",
  ghost: "text-indigo-400",
  dragon: "text-orange-400",
  ice: "text-cyan-300",
  rock: "text-stone-400",
  ground: "text-amber-600",
  poison: "text-purple-700",
  bug: "text-lime-400",
  dark: "text-gray-700",
  steel: "text-slate-400",
  fighting: "text-red-700",
  fairy: "text-pink-400",
  flying: "text-sky-300",
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

const getRarityGlow = (rarity: string) => {
  switch (rarity) {
    case "Legendary":
      return "ring-2 ring-yellow-400 shadow-[0_0_20px_3px_rgba(250,204,21,0.6)] animate-legendary";
    case "Epic":
      return "ring-2 ring-purple-500 shadow-[0_0_18px_3px_rgba(168,85,247,0.6)]";
    case "Rare":
      return "ring-2 ring-blue-400 shadow-[0_0_12px_3px_rgba(59,130,246,0.6)]";
    default:
      return "ring-1 ring-green-400 shadow-[0_0_10px_2px_rgba(74,222,128,0.5)]";
  }
};

const MyPokemonPage: React.FC = () => {
  const navigate = useNavigate();
  const [ownedPokemons, setOwnedPokemons] = useState<OwnedPokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOwnedPokemons = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!window.ethereum) {
        setError("MetaMask not detected");
        setLoading(false);
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();

      const contract = new ethers.Contract(
        contractAddress.address,
        CONTRACT_ABI,
        provider
      );

      // Get balance of NFTs owned by user
      const balance = await contract.balanceOf(address);
      const balanceNumber = balance.toNumber();

      console.log(`✅ Connected to contract: ${contractAddress.address}`);
      console.log(`✅ Your address: ${address}`);
      console.log(`✅ You own ${balanceNumber} Pokémon NFTs`);

      if (balanceNumber === 0) {
        setOwnedPokemons([]);
        setLoading(false);
        return;
      }

      // Get PokemonMinted events to find token IDs
      console.log("🔍 Fetching PokemonMinted events...");
      const filter = contract.filters.PokemonMinted(null, address);
      const events = await contract.queryFilter(filter);

      console.log(`📋 Found ${events.length} mint events for your address`);

      if (events.length === 0) {
        setOwnedPokemons([]);
        setLoading(false);
        return;
      }

      // Fetch metadata for each token you own
      const pokemonPromises = events.map(async (event) => {
        try {
          const tokenId = event.args?.tokenId?.toNumber();
          console.log(`🔍 Processing Token ID: ${tokenId}`);

          // Verify you still own this token (CRITICAL CHECK)
          try {
            const owner = await contract.ownerOf(tokenId);
            if (owner.toLowerCase() !== address.toLowerCase()) {
              console.log(
                `⚠️ Token ${tokenId} is no longer owned by you (owned by ${owner})`
              );
              return null;
            }
          } catch (ownerError) {
            console.log(`⚠️ Token ${tokenId} no longer exists or was burned`);
            return null;
          }

          // Get metadata URI
          const tokenURI = await contract.tokenURI(tokenId);
          console.log(
            `📄 Token ${tokenId} URI:`,
            tokenURI.slice(0, 50) + "..."
          );

          // Parse metadata (it's base64 encoded JSON)
          let metadata;
          if (tokenURI.startsWith("data:application/json;base64,")) {
            const base64Data = tokenURI.split(",")[1];
            const jsonString = atob(base64Data);
            metadata = JSON.parse(jsonString);
          } else {
            // If it's a regular URL, fetch it
            const response = await fetch(tokenURI);
            metadata = await response.json();
          }

          console.log(`✅ Token ${tokenId} metadata:`, metadata.name);

          // Extract stats from attributes
          const stats: Stats = {
            hp: 0,
            attack: 0,
            defense: 0,
            speed: 0,
            specialAttack: 0,
            specialDefense: 0,
          };

          metadata.attributes?.forEach((attr: any) => {
            switch (attr.trait_type) {
              case "HP":
                stats.hp = attr.value;
                break;
              case "Attack":
                stats.attack = attr.value;
                break;
              case "Defense":
                stats.defense = attr.value;
                break;
              case "Speed":
                stats.speed = attr.value;
                break;
            }
          });

          // Get Pokémon ID from image URL or metadata
          const imageUrl = metadata.image;
          const pokemonIdMatch = imageUrl.match(/\/(\d+)\.png/);
          const pokemonId = pokemonIdMatch ? parseInt(pokemonIdMatch[1]) : 0;

          // Get other attributes
          const rarity =
            metadata.attributes?.find((a: any) => a.trait_type === "Rarity")
              ?.value || "Common";
          const level =
            metadata.attributes?.find((a: any) => a.trait_type === "Level")
              ?.value || 1;
          const type =
            metadata.attributes?.find((a: any) => a.trait_type === "Type")
              ?.value || "normal";

          return {
            id: pokemonId,
            name: metadata.name,
            image: metadata.image,
            type: type.toLowerCase(),
            rarity,
            level,
            stats,
            tokenId: tokenId,
          };
        } catch (err) {
          console.error(`❌ Error fetching token:`, err);
          return null;
        }
      });

      const pokemons = (await Promise.all(pokemonPromises)).filter(
        Boolean
      ) as OwnedPokemon[];

      console.log(`✅ Successfully loaded ${pokemons.length} Pokémon`);

      // Sort by token ID (most recent first)
      pokemons.sort((a, b) => b.tokenId - a.tokenId);

      setOwnedPokemons(pokemons);
    } catch (error: any) {
      console.error("Error loading owned Pokémon:", error);
      setError(error.message || "Failed to load Pokémon");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOwnedPokemons();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <p className="text-gray-400">
              Loading your collection from blockchain...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
        <div className="text-center py-20">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold mb-2 text-red-400">
            Error Loading Collection
          </h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-yellow-500 text-black rounded-lg font-semibold hover:bg-yellow-400 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-yellow-400 mb-2">
            My Pokémon Collection
          </h1>
          <p className="text-gray-400">
            {ownedPokemons.length} Pokémon NFT
            {ownedPokemons.length !== 1 ? "s" : ""} owned on Sepolia testnet
          </p>
        </div>
        <button
          onClick={loadOwnedPokemons}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Refreshing..." : "🔄 Refresh"}
        </button>
      </div>

      {/* Empty State */}
      {ownedPokemons.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-bold mb-2">No Pokémon Yet</h2>
          <p className="text-gray-400 mb-6">
            Start your collection by purchasing Pokémon from the marketplace!
          </p>
          <button
            onClick={() => (window.location.href = "/marketplace")}
            className="px-6 py-3 bg-yellow-500 text-black rounded-lg font-semibold hover:bg-yellow-400 transition"
          >
            Visit Marketplace
          </button>
        </div>
      ) : (
        <>
          {/* Pokémon Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
            {ownedPokemons.map((pokemon) => (
              <div
                key={pokemon.tokenId}
                className={`group bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all transform hover:-translate-y-2 relative ${getRarityGlow(
                  pokemon.rarity
                )}`}
              >
                {/* NFT Badge */}
                <div className="absolute top-2 left-2 z-10">
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center gap-1">
                    🎮 NFT
                  </span>
                </div>

                {/* Level Badge */}
                <div className="absolute top-2 right-2 z-10">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/70 text-white border border-white/20">
                    Lv. {pokemon.level}
                  </span>
                </div>

                {/* Pokemon Image */}
                <div className="relative bg-gradient-to-b from-gray-100 to-gray-300 flex justify-center items-center p-6">
                  <img
                    src={pokemon.image}
                    alt={pokemon.name}
                    className="w-44 h-44 object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-110"
                  />
                </div>

                {/* Pokemon Info */}
                <div className="bg-gradient-to-b from-gray-700 to-gray-800 p-4 border-t border-gray-700">
                  <div className="mb-2">
                    <span
                      className={`capitalize font-semibold text-sm px-2 py-1 rounded-md bg-white/10 border border-white/20 ${
                        typeColors[pokemon.type] || "text-white"
                      }`}
                    >
                      {pokemon.type}
                    </span>
                  </div>

                  <h4 className="font-bold text-xl mb-2">
                    <span className={`${getRarityColor(pokemon.rarity)} mr-1`}>
                      {pokemon.rarity}
                    </span>
                    <span className="text-white">{pokemon.name}</span>
                  </h4>

                  {/* Stats Preview */}
                  <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                    <div className="bg-black/30 rounded p-1 text-center">
                      <p className="text-gray-400">HP</p>
                      <p className="font-bold text-red-400">
                        {pokemon.stats.hp}
                      </p>
                    </div>
                    <div className="bg-black/30 rounded p-1 text-center">
                      <p className="text-gray-400">ATK</p>
                      <p className="font-bold text-orange-400">
                        {pokemon.stats.attack}
                      </p>
                    </div>
                    <div className="bg-black/30 rounded p-1 text-center">
                      <p className="text-gray-400">DEF</p>
                      <p className="font-bold text-blue-400">
                        {pokemon.stats.defense}
                      </p>
                    </div>
                  </div>

                  {/* Token Info */}
                  <div className="space-y-1 text-xs text-gray-400 mb-3">
                    <div className="flex justify-between">
                      <span>Token ID:</span>
                      <span className="text-white font-mono">
                        #{pokemon.tokenId}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Network:</span>
                      <span className="text-blue-400">Sepolia</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        navigate(`/marketplace/${pokemon.tokenId}`, {
                          state: {
                            pokemon: {
                              ...pokemon,
                              ethPrice: 0,
                              price: 0,
                            },
                            source: "listings",
                          },
                        })
                      }
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                    >
                      View Details
                    </button>
                    <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm">
                      List for Sale
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-gray-400 text-sm mb-2">Total Pokémon</h3>
              <p className="text-3xl font-bold text-yellow-400">
                {ownedPokemons.length}
              </p>
            </div>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-gray-400 text-sm mb-2">Legendary</h3>
              <p className="text-3xl font-bold text-yellow-400">
                {ownedPokemons.filter((p) => p.rarity === "Legendary").length}
              </p>
            </div>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-gray-400 text-sm mb-2">Epic</h3>
              <p className="text-3xl font-bold text-purple-400">
                {ownedPokemons.filter((p) => p.rarity === "Epic").length}
              </p>
            </div>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-gray-400 text-sm mb-2">Average Level</h3>
              <p className="text-3xl font-bold text-blue-400">
                {ownedPokemons.length > 0
                  ? (
                      ownedPokemons.reduce((sum, p) => sum + p.level, 0) /
                      ownedPokemons.length
                    ).toFixed(1)
                  : "0"}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MyPokemonPage;
