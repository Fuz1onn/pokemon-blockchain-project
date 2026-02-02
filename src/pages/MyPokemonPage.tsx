import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import {
  FaEthereum,
  FaBolt,
  FaUsers,
  FaSyncAlt,
  FaTag,
  FaEdit,
  FaTimes,
} from "react-icons/fa";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import contractAddress from "../contracts/contract-address.json";
import {
  listPokemon,
  cancelListing,
  getListing,
} from "../contracts/contractUtils";

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

  // Listing status per tokenId
  const [listingStatuses, setListingStatuses] = useState<
    Record<
      number,
      {
        priceEth: string;
        isListed: boolean;
      }
    >
  >({});

  // Modal state
  const [selectedTokenForListing, setSelectedTokenForListing] = useState<
    number | null
  >(null);
  const [listingPriceEth, setListingPriceEth] = useState<string>("");
  const [isProcessingListing, setIsProcessingListing] = useState(false);
  const [listingActionError, setListingActionError] = useState<string | null>(
    null
  );
  const [showListingModal, setShowListingModal] = useState(false);

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

      const balance = await contract.balanceOf(address);
      const balanceNumber = balance.toNumber();

      if (balanceNumber === 0) {
        setOwnedPokemons([]);
        setLoading(false);
        return;
      }

      const filter = contract.filters.PokemonMinted(null, address);
      const events = await contract.queryFilter(filter);

      const pokemonPromises = events.map(async (event) => {
        try {
          const tokenId = event.args?.tokenId?.toNumber();

          const owner = await contract.ownerOf(tokenId);
          if (owner.toLowerCase() !== address.toLowerCase()) {
            return null;
          }

          const tokenURI = await contract.tokenURI(tokenId);
          let metadata;
          if (tokenURI.startsWith("data:application/json;base64,")) {
            const base64Data = tokenURI.split(",")[1];
            const jsonString = atob(base64Data);
            metadata = JSON.parse(jsonString);
          } else {
            const response = await fetch(tokenURI);
            metadata = await response.json();
          }

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

          const imageUrl = metadata.image;
          const pokemonIdMatch = imageUrl.match(/\/(\d+)\.png/);
          const pokemonId = pokemonIdMatch ? parseInt(pokemonIdMatch[1]) : 0;

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
          console.error("Error processing token:", err);
          return null;
        }
      });

      const pokemons = (await Promise.all(pokemonPromises)).filter(
        Boolean
      ) as OwnedPokemon[];
      pokemons.sort((a, b) => b.tokenId - a.tokenId);

      setOwnedPokemons(pokemons);
    } catch (error: any) {
      console.error("Error loading owned Pokémon:", error);
      setError(error.message || "Failed to load Pokémon");
    } finally {
      setLoading(false);
    }
  };

  const loadListingStatus = async (tokenId: number) => {
    try {
      const listing = await getListing(tokenId);
      setListingStatuses((prev) => ({
        ...prev,
        [tokenId]:
          listing && listing.isListed
            ? { priceEth: listing.price, isListed: true }
            : { priceEth: "", isListed: false },
      }));
    } catch (err) {
      console.error(`Failed to load listing for #${tokenId}:`, err);
      setListingStatuses((prev) => {
        const next = { ...prev };
        delete next[tokenId];
        return next;
      });
    }
  };

  const handleListingAction = async (
    action: "list" | "update" | "cancel",
    tokenId: number
  ) => {
    setIsProcessingListing(true);
    setListingActionError(null);

    try {
      if (action === "cancel") {
        await cancelListing(tokenId);
        alert(`Listing for #${tokenId} cancelled successfully!`);
      } else {
        const price = parseFloat(listingPriceEth);
        if (isNaN(price) || price <= 0) {
          throw new Error("Please enter a valid price greater than 0 ETH");
        }

        if (action === "list") {
          await listPokemon(tokenId, price);
          alert(`Pokémon #${tokenId} listed for ${price} ETH!`);
        } else if (action === "update") {
          await cancelListing(tokenId);
          await listPokemon(tokenId, price);
          alert(`Price updated to ${price} ETH for #${tokenId}`);
        }
      }

      // Refresh UI for this token
      await loadListingStatus(tokenId);
      // Optional: refresh full list if needed
      // await loadOwnedPokemons();

      if (action !== "cancel") {
        setShowListingModal(false);
        setListingPriceEth("");
      }
    } catch (err: any) {
      console.error("Listing action failed:", err);
      setListingActionError(err.message || "Action failed. Check console.");
    } finally {
      setIsProcessingListing(false);
    }
  };

  useEffect(() => {
    loadOwnedPokemons();
  }, []);

  // Load listing status for all owned Pokémon after they are loaded
  useEffect(() => {
    if (ownedPokemons.length > 0) {
      ownedPokemons.forEach((p) => loadListingStatus(p.tokenId));
    }
  }, [ownedPokemons.length]);

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
          className="px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 bg-yellow-500 text-black hover:bg-yellow-400"
        >
          <FaSyncAlt className={loading ? "animate-spin" : ""} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
            {ownedPokemons.map((pokemon) => {
              const status = listingStatuses[pokemon.tokenId] || {
                isListed: false,
                priceEth: "",
              };
              const isListed = status.isListed;

              return (
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

                  {/* Listed Badge */}
                  {isListed && (
                    <div className="absolute top-12 right-2 z-10 bg-yellow-500/80 text-black text-xs font-bold px-2 py-1 rounded-full">
                      Listed • {status.priceEth} ETH
                    </div>
                  )}

                  {/* Clickable Pokemon Image */}
                  <div
                    className="relative bg-gradient-to-b from-gray-100 to-gray-300 flex justify-center items-center p-6 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() =>
                      navigate(`/marketplace/${pokemon.tokenId}`, {
                        state: { pokemon, source: "owned" },
                      })
                    }
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for ${pokemon.name}`}
                  >
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
                      <span
                        className={`${getRarityColor(pokemon.rarity)} mr-1`}
                      >
                        {pokemon.rarity}
                      </span>
                      <span className="text-white">{pokemon.name}</span>
                    </h4>

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

                    {/* Action Buttons - only listing */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={async () => {
                          setSelectedTokenForListing(pokemon.tokenId);
                          setShowListingModal(true);
                          setListingPriceEth(status.priceEth || "");
                          // Status already loaded, but refresh to be sure
                          await loadListingStatus(pokemon.tokenId);
                        }}
                        className={`flex-1 py-2 px-3 rounded text-sm font-medium transition flex items-center justify-center gap-1.5 ${
                          isListed
                            ? "bg-purple-600 hover:bg-purple-700"
                            : "bg-green-600 hover:bg-green-700"
                        } text-white`}
                        disabled={isProcessingListing}
                      >
                        {isListed ? (
                          <>
                            <FaEdit size={14} /> Manage
                          </>
                        ) : (
                          <>
                            <FaTag size={14} /> List
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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

      {/* Listing Management Modal */}
      {/* Listing Management Modal */}
      <Dialog open={showListingModal} onOpenChange={setShowListingModal}>
        <DialogContent className="bg-gray-900 border border-gray-700 text-white max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {listingStatuses[selectedTokenForListing || 0]?.isListed
                ? "Update Listing Price"
                : "List Pokémon for Sale"}
            </DialogTitle>
          </DialogHeader>

          {selectedTokenForListing && (
            <div className="py-4 space-y-6">
              {/* Pokémon Preview */}
              <div className="flex items-center gap-4 bg-gray-800/50 p-4 rounded-lg">
                <img
                  src={
                    ownedPokemons.find(
                      (p) => p.tokenId === selectedTokenForListing
                    )?.image
                  }
                  alt="Pokémon"
                  className="w-16 h-16 object-contain drop-shadow-md"
                  onError={(e) =>
                    (e.currentTarget.src =
                      "https://via.placeholder.com/64?text=?")
                  }
                />
                <div>
                  <h3 className="font-bold text-lg">
                    {ownedPokemons.find(
                      (p) => p.tokenId === selectedTokenForListing
                    )?.name || "Pokémon"}
                  </h3>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <span
                      className={`font-medium ${getRarityColor(
                        ownedPokemons.find(
                          (p) => p.tokenId === selectedTokenForListing
                        )?.rarity || "Common"
                      )}`}
                    >
                      {ownedPokemons.find(
                        (p) => p.tokenId === selectedTokenForListing
                      )?.rarity || "Common"}
                    </span>
                    <span className="text-gray-400">
                      • Lv.{" "}
                      {ownedPokemons.find(
                        (p) => p.tokenId === selectedTokenForListing
                      )?.level || "?"}
                    </span>
                    <span className="text-gray-500 font-mono">
                      #{selectedTokenForListing}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Price in ETH (Sepolia testnet)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={listingPriceEth}
                    onChange={(e) => setListingPriceEth(e.target.value)}
                    placeholder="0.05"
                    disabled={isProcessingListing}
                    className="flex-1 bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none"
                  />
                  <span className="text-yellow-400 font-bold text-lg">ETH</span>
                </div>
                <p className="text-xs text-gray-500">
                  This price will be displayed on the marketplace. Minimum
                  recommended: 0.001 ETH
                </p>
              </div>

              {/* Current Price (if listed) */}
              {listingStatuses[selectedTokenForListing || 0]?.isListed && (
                <div className="bg-blue-900/30 border border-blue-700/50 p-3 rounded-lg">
                  <p className="text-sm text-blue-300">
                    Current listing price:{" "}
                    <span className="font-bold text-yellow-400">
                      {listingStatuses[selectedTokenForListing || 0].priceEth}{" "}
                      ETH
                    </span>
                  </p>
                </div>
              )}

              {/* Error Message */}
              {listingActionError && (
                <div className="bg-red-900/30 border border-red-700/50 p-3 rounded-lg text-red-300 text-sm">
                  {listingActionError}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowListingModal(false)}
              className="bg-neutral-900 text-gray-300 border border-gray-600 hover:bg-neutral-800 transition"
              disabled={isProcessingListing}
            >
              Cancel
            </Button>

            {listingStatuses[selectedTokenForListing || 0]?.isListed ? (
              <>
                <Button
                  onClick={() =>
                    selectedTokenForListing &&
                    handleListingAction("update", selectedTokenForListing)
                  }
                  disabled={
                    isProcessingListing ||
                    !listingPriceEth ||
                    parseFloat(listingPriceEth) <= 0
                  }
                  className="bg-purple-600 hover:bg-purple-700 text-white flex-1"
                >
                  {isProcessingListing ? (
                    <span className="flex items-center gap-2">
                      <FaSyncAlt className="animate-spin" /> Processing...
                    </span>
                  ) : (
                    "Update Price"
                  )}
                </Button>

                <Button
                  variant="destructive"
                  onClick={() =>
                    selectedTokenForListing &&
                    handleListingAction("cancel", selectedTokenForListing)
                  }
                  disabled={isProcessingListing}
                  className="flex-1"
                >
                  Cancel Listing
                </Button>
              </>
            ) : (
              <Button
                onClick={() =>
                  selectedTokenForListing &&
                  handleListingAction("list", selectedTokenForListing)
                }
                disabled={
                  isProcessingListing ||
                  !listingPriceEth ||
                  parseFloat(listingPriceEth) <= 0
                }
                className="bg-green-600 hover:bg-green-700 text-white flex-1"
              >
                {isProcessingListing ? (
                  <span className="flex items-center gap-2">
                    <FaSyncAlt className="animate-spin" /> Processing...
                  </span>
                ) : (
                  "Confirm Listing"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyPokemonPage;
