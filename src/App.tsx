// src/App.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import MyPokemonPage from "./pages/MyPokemonPage";
import MarketplacePage from "./pages/MarketplacePage";
import PokemonDetailsPage from "./pages/PokemonDetailsPage";
import BattleArenaPage from "./pages/BattleArenaPage";
import type { Pokemon, MarketplaceFilters } from "./utils/types";
import { loadOwnedPokemons } from "./contracts/loadOwnedPokemons";
import { fetchLeelasBalance } from "./contracts/leelasUtils";
import {
  addPendingLeelas,
  clearPendingLeelas,
  getPendingLeelas,
} from "./utils/pendingLeelas";
import { withdrawLeelasToWallet } from "./contracts/leelasWithdraw";
import { ethers } from "ethers";

type OwnedPokemon = {
  tokenId: number;
  name: string;
  image: string;
  level: number;
  rarity?: "Common" | "Rare" | "Epic" | "Legendary" | string;
  stats?: { hp: number; attack: number; defense: number; speed: number };
};

const App: React.FC = () => {
  const navigate = useNavigate();

  const [account, setAccount] = useState<string | null>(null);

  // on-chain LEELAS (wallet)
  const [leelasOnChain, setLeelasOnChain] = useState<string>("0");

  // off-chain pending LEELAS (game)
  const [leelasPending, setLeelasPending] = useState<number>(0);

  const [ownedPokemons, setOwnedPokemons] = useState<OwnedPokemon[]>([]);

  const [marketplacePokemons, setMarketplacePokemons] = useState<Pokemon[]>([]);
  const [marketplaceFilters, setMarketplaceFilters] =
    useState<MarketplaceFilters>({
      type: "All",
      rarity: "All",
      level: "All",
      price: "All",
      latest: "Default",
    });

  async function refreshOnChain(addr: string) {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const bal = await fetchLeelasBalance(provider, addr);
      setLeelasOnChain(bal);
    } catch (e) {
      console.error("Failed to fetch on-chain LEELAS:", e);
      setLeelasOnChain("0");
    }
  }

  function refreshPending(addr: string) {
    setLeelasPending(getPendingLeelas(addr));
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!account) return;

      // pending (off-chain)
      if (!cancelled) refreshPending(account);

      // owned NFTs
      try {
        const owned = await loadOwnedPokemons(account);
        if (!cancelled) setOwnedPokemons(owned);
      } catch (err) {
        console.error("Failed to load owned pokemons:", err);
        if (!cancelled) setOwnedPokemons([]);
      }

      // on-chain wallet balance
      await refreshOnChain(account);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [account]);

  useEffect(() => {
    if (!account) return;
    const onFocus = () => {
      refreshOnChain(account);
      refreshPending(account);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [account]);

  const handleLogout = () => {
    setAccount(null);
    setOwnedPokemons([]);
    setLeelasOnChain("0");
    setLeelasPending(0);
    navigate("/");
  };

  const handleStartMatch = () => navigate("/battle");

  const canStartMatch = ownedPokemons.length >= 3;

  const leelasOnChainInt = useMemo(
    () => Math.floor(Number(leelasOnChain) || 0),
    [leelasOnChain],
  );

  // ✅ battle adds to pending immediately (no MetaMask)
  const earnPendingLeelas = (amount: number) => {
    if (!account) return;
    const next = addPendingLeelas(account, amount);
    setLeelasPending(next);
  };

  // ✅ withdraw: one MetaMask tx (owner wallet required)
  const withdrawPendingLeelas = async () => {
    if (!account) return;
    if (!window.ethereum) throw new Error("MetaMask not installed");

    const amount = getPendingLeelas(account);
    if (amount <= 0) return;

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const network = await provider.getNetwork();
    if (network.chainId !== 11155111)
      throw new Error("Please switch to Sepolia");

    const signer = provider.getSigner();

    // This mints on-chain to the player wallet and clears pending
    await withdrawLeelasToWallet(signer, account, amount);

    clearPendingLeelas(account);
    setLeelasPending(0);

    await refreshOnChain(account);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          account ? (
            <Navigate to="/home" replace />
          ) : (
            <LoginPage
              onLogin={(addr) => {
                setAccount(addr);
                navigate("/home");
              }}
            />
          )
        }
      />

      <Route
        path="/home"
        element={
          account ? (
            <MainLayout
              account={account}
              leelasBalance={leelasOnChainInt}
              onLogout={handleLogout}
              // ✅ add these props to MainLayout (or place button in HomePage if you prefer)
              leelasPending={leelasPending}
              onWithdrawLeelas={withdrawPendingLeelas}
            >
              <HomePage
                account={account}
                ownedPokemons={ownedPokemons as any}
                leelasBalance={leelasOnChainInt}
                onStartMatch={handleStartMatch}
                onLogout={handleLogout}
                canStartMatch={canStartMatch}
              />
            </MainLayout>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/mypokemon"
        element={
          account ? (
            <MainLayout
              account={account}
              leelasBalance={leelasOnChainInt}
              onLogout={handleLogout}
              leelasPending={leelasPending}
              onWithdrawLeelas={withdrawPendingLeelas}
            >
              <MyPokemonPage ownedPokemons={ownedPokemons as any} />
            </MainLayout>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/marketplace"
        element={
          account ? (
            <MainLayout
              account={account}
              leelasBalance={leelasOnChainInt}
              onLogout={handleLogout}
              leelasPending={leelasPending}
              onWithdrawLeelas={withdrawPendingLeelas}
            >
              <MarketplacePage
                marketplacePokemons={marketplacePokemons}
                setMarketplacePokemons={setMarketplacePokemons}
                filters={marketplaceFilters}
                setFilters={setMarketplaceFilters}
              />
            </MainLayout>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/battle"
        element={
          account ? (
            <MainLayout
              account={account}
              leelasBalance={leelasOnChainInt}
              onLogout={handleLogout}
              leelasPending={leelasPending}
              onWithdrawLeelas={withdrawPendingLeelas}
            >
              <BattleArenaPage
                ownedPokemons={ownedPokemons as any}
                onEarnLeelas={earnPendingLeelas}
              />
            </MainLayout>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/marketplace/:tokenId"
        element={
          account ? (
            <MainLayout
              account={account}
              leelasBalance={leelasOnChainInt}
              onLogout={handleLogout}
              leelasPending={leelasPending}
              onWithdrawLeelas={withdrawPendingLeelas}
            >
              <PokemonDetailsPage />
            </MainLayout>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  );
};

export default App;
