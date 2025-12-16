import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { v4 as uuidv4 } from "uuid";
import { calculateEthPrice } from "../utils/price";
import {
  mintAndBuyPokemon,
  buyListedPokemon,
  getAllListings,
  checkNetwork,
} from "../contracts/contractUtils";
import {
  FaEthereum,
  FaClock,
  FaBolt,
  FaUsers,
  FaSyncAlt,
} from "react-icons/fa";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type {
  GeneratedPokemon,
  MintedPokemon,
  MarketplaceFilters,
  Stats,
} from "../utils/types";

const REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_DAILY_REFRESHES = 10;
const MAX_DAILY_PURCHASES = 5;
const DAILY_DROP_COUNT = 4; // Only 4 Pokémon in Daily Drop

// Marketplace exclusive Pokémon (never in Daily Drop)
const COMMUNITY_MARKET_EXCLUSIVES = [
  "Mewtwo",
  "Mew",
  "Articuno",
  "Zapdos",
  "Moltres",
  "Dragonite",
];

// Rarity limits for Daily Drop (4 total)
// These are MAXIMUM limits, not guarantees
const RARITY_LIMITS = {
  Legendary: 1, // Max 1 legendary (but might get 0)
  Epic: 2, // Max 2 epics
  Rare: 3, // Max 3 rares
  Common: 4, // Max 4 commons (can be all common)
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

const getRandomRarityForDailyDrop = (): string => {
  const roll = Math.random();
  if (roll < 0.01) return "Legendary"; // 1%
  if (roll < 0.06) return "Epic"; // 5%
  if (roll < 0.26) return "Rare"; // 20%
  return "Common"; // 74%
};

const generateStats = (level: number, rarity: string): Stats => {
  const base = { Common: 40, Rare: 60, Epic: 80, Legendary: 100 }[rarity] ?? 40;
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

interface RefreshData {
  count: number;
  lastReset: number;
}

interface PurchaseData {
  count: number;
  lastReset: number;
}

const MarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const [dailyDropPokemons, setDailyDropPokemons] = useState<
    GeneratedPokemon[]
  >([]);
  const [communityMarketPokemons, setCommunityMarketPokemons] = useState<
    MintedPokemon[]
  >([]);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userAddress, setUserAddress] = useState<string>("");
  const [refreshData, setRefreshData] = useState<RefreshData>({
    count: 0,
    lastReset: Date.now(),
  });
  const [purchaseData, setPurchaseData] = useState<PurchaseData>({
    count: 0,
    lastReset: Date.now(),
  });
  const [filters, setFilters] = useState<MarketplaceFilters>({
    type: "All",
    rarity: "All",
    level: "All",
    price: "All",
  });
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedPokemon, setSelectedPokemon] =
    useState<GeneratedPokemon | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<{
    title: string;
    message: string;
    tokenId?: number;
    txHash?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<{
    title: string;
    message: string;
  } | null>(null);

  // Get user address
  useEffect(() => {
    const getAddress = async () => {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        setUserAddress(address);

        // Check if we need to reset daily limits (based on UTC midnight)
        const now = new Date();
        const lastResetDate = new Date(refreshData.lastReset);

        // If it's a new day (UTC), reset both refresh and purchase counts
        if (
          now.getUTCDate() !== lastResetDate.getUTCDate() ||
          now.getUTCMonth() !== lastResetDate.getUTCMonth() ||
          now.getUTCFullYear() !== lastResetDate.getUTCFullYear()
        ) {
          const newResetTime = Date.now();

          setRefreshData({ count: 0, lastReset: newResetTime });
          localStorage.setItem(
            `refreshData_${address}`,
            JSON.stringify({ count: 0, lastReset: newResetTime })
          );

          setPurchaseData({ count: 0, lastReset: newResetTime });
          localStorage.setItem(
            `purchaseData_${address}`,
            JSON.stringify({ count: 0, lastReset: newResetTime })
          );
        } else {
          // Load saved data
          const savedRefreshData = localStorage.getItem(
            `refreshData_${address}`
          );
          if (savedRefreshData) {
            setRefreshData(JSON.parse(savedRefreshData));
          }

          const savedPurchaseData = localStorage.getItem(
            `purchaseData_${address}`
          );
          if (savedPurchaseData) {
            setPurchaseData(JSON.parse(savedPurchaseData));
          }
        }
      }
    };
    getAddress();
  }, []);

  // Load Daily Drop
  useEffect(() => {
    const savedDailyDrop = localStorage.getItem("dailyDropMarketplace");
    const savedRefresh = localStorage.getItem("lastMarketplaceRefresh");

    if (savedDailyDrop && savedRefresh) {
      const lastRefreshDate = new Date(parseInt(savedRefresh));
      const now = new Date();

      // Check if it's still the same day (UTC)
      if (
        lastRefreshDate.getUTCDate() === now.getUTCDate() &&
        lastRefreshDate.getUTCMonth() === now.getUTCMonth() &&
        lastRefreshDate.getUTCFullYear() === now.getUTCFullYear()
      ) {
        setDailyDropPokemons(JSON.parse(savedDailyDrop));
        setLastRefresh(parseInt(savedRefresh));
        return;
      }
    }

    // Generate new daily drop if no valid cache
    generateDailyDrop(true); // Auto-refresh doesn't count toward limit
  }, []);

  // Auto-refresh at midnight UTC
  useEffect(() => {
    const checkAndRefresh = () => {
      const now = Date.now();
      const lastRefreshDate = new Date(lastRefresh);
      const currentDate = new Date(now);

      if (lastRefreshDate.getUTCDate() !== currentDate.getUTCDate()) {
        generateDailyDrop(true);
      }
    };

    const timer = setInterval(checkAndRefresh, 60000);
    return () => clearInterval(timer);
  }, [lastRefresh]);

  // Load Community Market
  useEffect(() => {
    loadCommunityMarket();
  }, []);

  const createMetadataUri = (
    pokemonData: any,
    rarity: string,
    level: number,
    stats: Stats
  ) => {
    const metadata = {
      name:
        pokemonData.name.charAt(0).toUpperCase() + pokemonData.name.slice(1),
      description: `A ${rarity} ${pokemonData.name} at level ${level}`,
      image: pokemonData.sprites.other["official-artwork"].front_default,
      attributes: [
        { trait_type: "Rarity", value: rarity },
        { trait_type: "Level", value: level },
        { trait_type: "Type", value: pokemonData.types[0].type.name },
        { trait_type: "HP", value: stats.hp },
        { trait_type: "Attack", value: stats.attack },
        { trait_type: "Defense", value: stats.defense },
        { trait_type: "Speed", value: stats.speed },
      ],
    };

    return `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;
  };

  const generateDailyDrop = async (isAutoRefresh = false) => {
    setLoading(true);
    const fetched: GeneratedPokemon[] = [];
    const rarityCounts = { Legendary: 0, Epic: 0, Rare: 0, Common: 0 };

    // Generate exactly 4 Pokémon with rarity limits
    while (fetched.length < DAILY_DROP_COUNT) {
      const id = Math.floor(Math.random() * 151) + 1;

      try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        const data = await res.json();

        const pokemonName =
          data.name.charAt(0).toUpperCase() + data.name.slice(1);

        // Skip if it's a Community Market exclusive
        if (COMMUNITY_MARKET_EXCLUSIVES.includes(pokemonName)) {
          continue;
        }

        const rarity = getRandomRarityForDailyDrop();

        // Check rarity limits
        if (
          rarityCounts[rarity as keyof typeof rarityCounts] >=
          RARITY_LIMITS[rarity as keyof typeof RARITY_LIMITS]
        ) {
          continue;
        }

        // Daily Drop only has level 1-15
        const level = Math.floor(Math.random() * 15) + 1;
        const stats = generateStats(level, rarity);
        const { eth, usd } = calculateEthPrice(rarity, level);

        // Apply 20% markup for Daily Drop
        const markup = 1.2;
        const markedUpEth = eth * markup;
        const markedUpUsd = usd * markup;

        const metadataUri = createMetadataUri(data, rarity, level, stats);

        fetched.push({
          id: data.id,
          name: pokemonName,
          image: data.sprites.other["official-artwork"].front_default,
          type: data.types[0].type.name,
          rarity,
          price: parseFloat(markedUpUsd.toFixed(2)),
          ethPrice: parseFloat(markedUpEth.toFixed(5)),
          tempId: uuidv4(),
          level,
          timestamp: Date.now(),
          stats,
          metadataUri,
        });

        rarityCounts[rarity as keyof typeof rarityCounts]++;
      } catch (err) {
        console.error("Error fetching Pokémon:", err);
      }
    }

    setDailyDropPokemons(fetched);
    setLastRefresh(Date.now());

    localStorage.setItem("dailyDropMarketplace", JSON.stringify(fetched));
    localStorage.setItem("lastMarketplaceRefresh", Date.now().toString());
    setLoading(false);

    // If manual refresh, increment counter
    if (!isAutoRefresh && userAddress) {
      const newRefreshData = {
        count: refreshData.count + 1,
        lastReset: refreshData.lastReset,
      };
      setRefreshData(newRefreshData);
      localStorage.setItem(
        `refreshData_${userAddress}`,
        JSON.stringify(newRefreshData)
      );
    }
  };

  // Generate a single replacement Pokémon for Daily Drop
  const generateReplacementPokemon =
    async (): Promise<GeneratedPokemon | null> => {
      const maxAttempts = 50;
      let attempts = 0;

      while (attempts < maxAttempts) {
        const id = Math.floor(Math.random() * 151) + 1;

        try {
          const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
          const data = await res.json();

          const pokemonName =
            data.name.charAt(0).toUpperCase() + data.name.slice(1);

          // Skip if it's a Community Market exclusive
          if (COMMUNITY_MARKET_EXCLUSIVES.includes(pokemonName)) {
            attempts++;
            continue;
          }

          const rarity = getRandomRarityForDailyDrop();
          const level = Math.floor(Math.random() * 15) + 1;
          const stats = generateStats(level, rarity);
          const { eth, usd } = calculateEthPrice(rarity, level);

          const markup = 1.2;
          const markedUpEth = eth * markup;
          const markedUpUsd = usd * markup;

          const metadataUri = createMetadataUri(data, rarity, level, stats);

          return {
            id: data.id,
            name: pokemonName,
            image: data.sprites.other["official-artwork"].front_default,
            type: data.types[0].type.name,
            rarity,
            price: parseFloat(markedUpUsd.toFixed(2)),
            ethPrice: parseFloat(markedUpEth.toFixed(5)),
            tempId: uuidv4(),
            level,
            timestamp: Date.now(),
            stats,
            metadataUri,
          };
        } catch (err) {
          console.error("Error fetching replacement Pokémon:", err);
        }

        attempts++;
      }

      return null;
    };

  const loadCommunityMarket = async () => {
    try {
      const listings = await getAllListings();
      setCommunityMarketPokemons([]);
    } catch (error) {
      console.error("Error loading Community Market:", error);
    }
  };

  const canPurchase = (): { canPurchase: boolean; reason?: string } => {
    const timeSinceReset = Date.now() - purchaseData.lastReset;

    if (timeSinceReset >= REFRESH_INTERVAL) {
      const newData = { count: 0, lastReset: Date.now() };
      setPurchaseData(newData);
      if (userAddress) {
        localStorage.setItem(
          `purchaseData_${userAddress}`,
          JSON.stringify(newData)
        );
      }
      return { canPurchase: true };
    }

    if (purchaseData.count >= MAX_DAILY_PURCHASES) {
      const hoursUntilReset = Math.ceil(
        (REFRESH_INTERVAL - timeSinceReset) / (60 * 60 * 1000)
      );
      return {
        canPurchase: false,
        reason: `Daily purchase limit reached (${MAX_DAILY_PURCHASES}/day). Resets in ${hoursUntilReset}h`,
      };
    }

    return { canPurchase: true };
  };

  const handleBuyFromDailyDrop = async (pokemon: GeneratedPokemon) => {
    try {
      const purchaseCheck = canPurchase();
      if (!purchaseCheck.canPurchase) {
        alert(`❌ ${purchaseCheck.reason}`);
        return;
      }

      setBuyingId(pokemon.tempId);
      await checkNetwork();

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();

      const result = await mintAndBuyPokemon(
        address,
        pokemon.metadataUri!,
        pokemon.ethPrice
      );

      if (result.success) {
        const newPurchaseData = {
          count: purchaseData.count + 1,
          lastReset: purchaseData.lastReset,
        };
        setPurchaseData(newPurchaseData);
        localStorage.setItem(
          `purchaseData_${address}`,
          JSON.stringify(newPurchaseData)
        );

        // Save to owned Pokémon
        const ownedPokemons = JSON.parse(
          localStorage.getItem(`ownedPokemons_${address}`) || "[]"
        );
        ownedPokemons.push({
          ...pokemon,
          tokenId: result.tokenId,
          purchasedAt: Date.now(),
        });
        localStorage.setItem(
          `ownedPokemons_${address}`,
          JSON.stringify(ownedPokemons)
        );

        // Show success modal
        setSuccessMessage({
          title: "Purchase Successful! 🎉",
          message: `You've successfully minted ${pokemon.name}!`,
          tokenId: result.tokenId,
          txHash: result.transactionHash,
        });
        setShowSuccessModal(true);

        // Generate replacement Pokémon and update the slot
        const replacement = await generateReplacementPokemon();
        if (replacement) {
          setDailyDropPokemons((prev) => {
            const newPokemons = prev.map((p) =>
              p.tempId === pokemon.tempId ? replacement : p
            );
            localStorage.setItem(
              "dailyDropMarketplace",
              JSON.stringify(newPokemons)
            );
            return newPokemons;
          });
        } else {
          // If replacement fails, just remove the bought Pokémon
          setDailyDropPokemons((prev) => {
            const newPokemons = prev.filter((p) => p.tempId !== pokemon.tempId);
            localStorage.setItem(
              "dailyDropMarketplace",
              JSON.stringify(newPokemons)
            );
            return newPokemons;
          });
        }
      }
    } catch (error: any) {
      console.error("Purchase failed:", error);
      alert(`❌ Purchase failed: ${error.message}`);
    } finally {
      setBuyingId(null);
      setShowBuyModal(false);
      setSelectedPokemon(null);
    }
  };

  const handleBuyFromCommunityMarket = async (pokemon: MintedPokemon) => {
    try {
      const purchaseCheck = canPurchase();
      if (!purchaseCheck.canPurchase) {
        setErrorMessage({
          title: "Purchase Limit Reached",
          message:
            purchaseCheck.reason || "You've reached your daily purchase limit.",
        });
        setShowErrorModal(true);
        return;
      }

      setBuyingId(pokemon.tokenId.toString());
      await checkNetwork();

      const confirmed = window.confirm(
        `Buy ${pokemon.name} for Ξ ${pokemon.ethPrice}?`
      );

      if (!confirmed) {
        setBuyingId(null);
        return;
      }

      const result = await buyListedPokemon(pokemon.tokenId, pokemon.ethPrice);

      if (result.success) {
        const newPurchaseData = {
          count: purchaseData.count + 1,
          lastReset: purchaseData.lastReset,
        };
        setPurchaseData(newPurchaseData);
        if (userAddress) {
          localStorage.setItem(
            `purchaseData_${userAddress}`,
            JSON.stringify(newPurchaseData)
          );
        }

        // Show success modal
        setSuccessMessage({
          title: "Purchase Successful! 🎉",
          message: `You've successfully purchased ${pokemon.name}!`,
          tokenId: pokemon.tokenId,
          txHash: result.transactionHash,
        });
        setShowSuccessModal(true);

        loadCommunityMarket();
      }
    } catch (error: any) {
      console.error("Purchase failed:", error);

      // Show error modal instead of alert
      let errorTitle = "Purchase Failed";
      let errorMsg = error.message || "An unknown error occurred";

      if (error.code === 4001 || error.code === "ACTION_REJECTED") {
        errorTitle = "Transaction Rejected";
        errorMsg = "You rejected the transaction in MetaMask.";
      } else if (error.message?.includes("insufficient funds")) {
        errorTitle = "Insufficient Funds";
        errorMsg = "You don't have enough ETH to complete this purchase.";
      } else if (error.message?.includes("network")) {
        errorTitle = "Network Error";
        errorMsg = "Please check your connection and try again.";
      }

      setErrorMessage({
        title: errorTitle,
        message: errorMsg,
      });
      setShowErrorModal(true);
    } finally {
      setBuyingId(null);
    }
  };

  const handleCardClick = (
    pokemon: GeneratedPokemon | MintedPokemon,
    source: "daily" | "community"
  ) => {
    navigate(
      `/marketplace/${"tempId" in pokemon ? pokemon.tempId : pokemon.tokenId}`,
      {
        state: { pokemon, source: source === "daily" ? "general" : "listings" },
      }
    );
  };

  const handleForceRefresh = () => {
    // Check if we need to reset (new UTC day)
    const now = new Date();
    const lastResetDate = new Date(refreshData.lastReset);

    if (
      now.getUTCDate() !== lastResetDate.getUTCDate() ||
      now.getUTCMonth() !== lastResetDate.getUTCMonth() ||
      now.getUTCFullYear() !== lastResetDate.getUTCFullYear()
    ) {
      // New day - reset counter
      const newResetTime = Date.now();
      setRefreshData({ count: 0, lastReset: newResetTime });
      if (userAddress) {
        localStorage.setItem(
          `refreshData_${userAddress}`,
          JSON.stringify({ count: 0, lastReset: newResetTime })
        );
      }
      generateDailyDrop();
      return;
    }

    // Check daily limit
    if (refreshData.count >= MAX_DAILY_REFRESHES) {
      const nextMidnight = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + 1,
          0,
          0,
          0
        )
      );
      const hoursUntilReset = Math.ceil(
        (nextMidnight.getTime() - now.getTime()) / (60 * 60 * 1000)
      );

      setErrorMessage({
        title: "Refresh Limit Reached",
        message: `Daily refresh limit reached (${MAX_DAILY_REFRESHES}/day). Resets in ${hoursUntilReset} hours.`,
      });
      setShowErrorModal(true);
      return;
    }

    generateDailyDrop();
  };

  const getTimeUntilRefresh = () => {
    const now = new Date();
    const nextMidnight = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
        0
      )
    );
    const timeRemaining = nextMidnight.getTime() - now.getTime();

    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor(
      (timeRemaining % (1000 * 60 * 60)) / (1000 * 60)
    );

    return `${hours}h ${minutes}m`;
  };

  const filterPokemons = <T extends GeneratedPokemon | MintedPokemon>(
    pokemons: T[]
  ): T[] => {
    return pokemons.filter((p) => {
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
    });
  };

  // Only filter Community Market, not Daily Drop
  const filteredCommunityMarket = filterPokemons(communityMarketPokemons);
  const canRefresh = refreshData.count < MAX_DAILY_REFRESHES;

  // Render Pokemon Card
  const renderPokemonCard = (
    pokemon: GeneratedPokemon | MintedPokemon,
    source: "daily" | "community"
  ) => {
    const isBuying =
      buyingId ===
      ("tempId" in pokemon ? pokemon.tempId : pokemon.tokenId.toString());
    const isDailyDrop = source === "daily";

    return (
      <div
        key={
          isDailyDrop
            ? (pokemon as GeneratedPokemon).tempId
            : (pokemon as MintedPokemon).tokenId
        }
        className={`group bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all transform hover:-translate-y-2 relative ${getRarityGlow(
          pokemon.rarity
        )}`}
      >
        {/* Source Badge */}
        <div className="absolute top-2 left-2 z-10">
          {isDailyDrop ? (
            <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-500 text-black flex items-center gap-1">
              <FaBolt className="text-xs" /> Daily Drop
            </span>
          ) : (
            <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-500 text-white flex items-center gap-1">
              <FaUsers className="text-xs" /> Community
            </span>
          )}
        </div>

        {/* Level Badge */}
        <div className="absolute top-2 right-2 z-10">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/70 text-white border border-white/20">
            Lv. {pokemon.level}
          </span>
        </div>

        {/* Pokemon Image */}
        <div
          className="relative bg-gradient-to-b from-gray-100 to-gray-300 flex justify-center items-center p-6 cursor-pointer"
          onClick={() => handleCardClick(pokemon, source)}
        >
          <img
            src={pokemon.image}
            alt={pokemon.name}
            className="w-44 h-44 object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-110"
          />
        </div>

        {/* Pokemon Info */}
        <div className="bg-gradient-to-b from-gray-700 to-gray-800 p-4 border-t border-gray-700 relative transition-all duration-300 group-hover:-translate-y-10">
          <div className="mb-2">
            <span
              className={`capitalize font-semibold text-sm px-2 py-1 rounded-md bg-white/10 border border-white/20 ${
                typeColors[
                  pokemon.type.charAt(0).toUpperCase() + pokemon.type.slice(1)
                ] || "text-white"
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
              <p className="font-bold text-red-400">{pokemon.stats.hp}</p>
            </div>
            <div className="bg-black/30 rounded p-1 text-center">
              <p className="text-gray-400">ATK</p>
              <p className="font-bold text-orange-400">
                {pokemon.stats.attack}
              </p>
            </div>
            <div className="bg-black/30 rounded p-1 text-center">
              <p className="text-gray-400">DEF</p>
              <p className="font-bold text-blue-400">{pokemon.stats.defense}</p>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between mb-1">
            <p className="text-yellow-400 font-bold text-lg flex items-center gap-2">
              <FaEthereum /> {pokemon.ethPrice}
              <span className="text-gray-400 text-sm font-normal">
                (~${pokemon.price})
              </span>
            </p>
          </div>

          {/* Buy Button */}
          <div className="absolute bottom-4 left-0 right-0 px-4 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-11 transition-all duration-300">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isDailyDrop) {
                  setSelectedPokemon(pokemon as GeneratedPokemon);
                  setShowBuyModal(true);
                } else {
                  handleBuyFromCommunityMarket(pokemon as MintedPokemon);
                }
              }}
              disabled={isBuying}
              className={`w-full ${
                isBuying
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-yellow-500 hover:bg-yellow-400"
              } text-black font-semibold py-2 px-4 rounded-lg transition cursor-pointer`}
            >
              {isBuying
                ? "Processing..."
                : isDailyDrop
                ? "Mint & Buy"
                : "Buy Now"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-yellow-400 mb-2 flex items-center gap-3">
          🏪 Pokémon Marketplace
        </h1>
        <p className="text-gray-400">
          Discover, collect, and trade rare Pokémon NFTs
        </p>
      </div>

      {/* Purchase Info Banner */}
      <div className="mb-6 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <FaClock className="text-yellow-400 text-2xl" />
            <div>
              <p className="text-sm text-gray-300">Daily Drop Refreshes In:</p>
              <p className="text-lg font-bold text-yellow-400">
                {getTimeUntilRefresh()}
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-300">
            <p>
              ⚡ Force Refresh: {refreshData.count}/{MAX_DAILY_REFRESHES} used
              today
            </p>
            <p>
              🛒 Purchases: {purchaseData.count}/{MAX_DAILY_PURCHASES} used
              today
            </p>
          </div>
          <button
            onClick={handleForceRefresh}
            disabled={loading || !canRefresh}
            className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
              loading || !canRefresh
                ? "bg-gray-600 cursor-not-allowed opacity-50"
                : "bg-yellow-500 text-black hover:bg-yellow-400"
            }`}
          >
            <FaSyncAlt className={loading ? "animate-spin" : ""} />
            {loading
              ? "Refreshing..."
              : `Refresh (${MAX_DAILY_REFRESHES - refreshData.count} left)`}
          </button>
        </div>
      </div>

      {/* Daily Drop Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <FaBolt className="text-yellow-400" />⚡ Daily Drop
          </h2>
          <span className="text-sm text-gray-400">
            {dailyDropPokemons.length} of {DAILY_DROP_COUNT} available
          </span>
        </div>

        {loading && dailyDropPokemons.length === 0 ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading Daily Drop...</p>
            </div>
          </div>
        ) : dailyDropPokemons.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {dailyDropPokemons.map((pokemon) =>
              renderPokemonCard(pokemon, "daily")
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-800/50 border border-gray-700 rounded-lg">
            <p className="text-gray-400 text-lg">
              Daily Drop is currently empty
            </p>
          </div>
        )}
      </div>

      {/* Community Market Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <FaUsers className="text-blue-400" />
            👥 Community Market
          </h2>
          {filteredCommunityMarket.length > 0 && (
            <span className="text-sm text-gray-400">
              {filteredCommunityMarket.length} listing
              {filteredCommunityMarket.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Filters - Only for Community Market */}
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="bg-gray-800 border border-gray-600 rounded-lg p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
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
            className="bg-gray-800 border border-gray-600 rounded-lg p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
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
            className="bg-gray-800 border border-gray-600 rounded-lg p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="All">All Levels</option>
            <option value="1-10">Level 1–10</option>
            <option value="11-20">Level 11–20</option>
            <option value="21-30">Level 21–30</option>
          </select>

          <select
            value={filters.price}
            onChange={(e) => setFilters({ ...filters, price: e.target.value })}
            className="bg-gray-800 border border-gray-600 rounded-lg p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="All">All Prices</option>
            <option value="<80">Below $80</option>
            <option value="80-150">$80–$150</option>
            <option value=">150">Above $150</option>
          </select>

          <button
            onClick={() =>
              setFilters({
                type: "All",
                rarity: "All",
                level: "All",
                price: "All",
              })
            }
            className="bg-gray-800 border border-gray-600 rounded-lg p-2 px-4 text-white hover:bg-gray-700 transition"
          >
            Reset Filters
          </button>
        </div>

        {filteredCommunityMarket.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredCommunityMarket.map((pokemon) =>
              renderPokemonCard(pokemon, "community")
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-800/50 border border-gray-700 rounded-lg">
            <p className="text-gray-400 text-lg mb-2">
              {communityMarketPokemons.length === 0
                ? "🏪 No player listings available yet"
                : "No Pokémon match your filters in Community Market"}
            </p>
            <p className="text-gray-500 text-sm">
              {communityMarketPokemons.length === 0
                ? "Train your Pokémon and be the first to list!"
                : "Try adjusting your filters"}
            </p>
          </div>
        )}
      </div>

      {/* Buy Confirmation Modal */}
      <Dialog open={showBuyModal} onOpenChange={setShowBuyModal}>
        <DialogContent className="bg-gray-900 border border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
          </DialogHeader>
          {selectedPokemon && (
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={selectedPokemon.image}
                  alt={selectedPokemon.name}
                  className="w-20 h-20 object-contain"
                />
                <div>
                  <h3 className="text-xl font-bold">{selectedPokemon.name}</h3>
                  <p
                    className={`text-sm ${getRarityColor(
                      selectedPokemon.rarity
                    )}`}
                  >
                    {selectedPokemon.rarity}
                  </p>
                  <p className="text-sm text-gray-400">
                    Level {selectedPokemon.level}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-black/30 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Source:</span>
                  <span className="text-yellow-400 font-semibold flex items-center gap-1">
                    <FaBolt /> Daily Drop
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Price:</span>
                  <span className="text-yellow-400 font-bold flex items-center gap-1">
                    <FaEthereum /> {selectedPokemon.ethPrice} (~$
                    {selectedPokemon.price})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Purchases Today:</span>
                  <span className="text-white font-semibold">
                    {MAX_DAILY_PURCHASES - purchaseData.count}/
                    {MAX_DAILY_PURCHASES}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-400">
                This will create a blockchain transaction to mint this Pokémon
                NFT.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBuyModal(false);
                setSelectedPokemon(null);
              }}
              className="bg-neutral-900 text-gray-300 border border-gray-600 hover:bg-neutral-800 transition"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedPokemon && handleBuyFromDailyDrop(selectedPokemon)
              }
              disabled={buyingId !== null}
              className="bg-yellow-500 text-black hover:bg-yellow-400 transition"
            >
              {buyingId !== null ? "Processing..." : "Confirm Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="bg-gray-900 border border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {successMessage?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-lg mb-4">{successMessage?.message}</p>
            </div>

            <div className="p-4 bg-black/30 rounded-lg space-y-2">
              {successMessage?.tokenId && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Token ID:</span>
                  <span className="text-white font-bold">
                    #{successMessage.tokenId}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Purchases Today:</span>
                <span className="text-white font-semibold">
                  {purchaseData.count}/{MAX_DAILY_PURCHASES}
                </span>
              </div>
              {successMessage?.txHash && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Transaction:</span>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${successMessage.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition font-mono text-sm"
                  >
                    {successMessage.txHash.slice(0, 10)}...
                  </a>
                </div>
              )}
            </div>

            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm text-center">
                ✅ Your Pokémon has been added to your collection!
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => navigate("/mypokemon")}
              className="bg-blue-500 text-white hover:bg-blue-400 transition"
            >
              View My Pokémon
            </Button>
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="bg-yellow-500 text-black hover:bg-yellow-400 transition"
            >
              Continue Shopping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="bg-gray-900 border border-red-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl text-red-400">
              {errorMessage?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <p className="text-lg mb-4">{errorMessage?.message}</p>
            </div>

            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm text-center">
                Please try again or contact support if the issue persists.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowErrorModal(false)}
              className="bg-red-500 text-white hover:bg-red-400 transition w-full"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketplacePage;
