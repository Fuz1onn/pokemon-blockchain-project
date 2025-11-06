import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import MyPokemonPage from "./pages/MyPokemonPage";
import MarketplacePage from "./pages/MarketplacePage";

// Pokémon GIFs
import pikachu from "./assets/pokemons/pikachu.gif";
import charmander from "./assets/pokemons/charmander.gif";
import bulbasaur from "./assets/pokemons/bulbasaur.gif";

const initialPokemons = [
  { id: 1, name: "Pikachu", image: pikachu, level: 5 },
  { id: 2, name: "Charmander", image: charmander, level: 5 },
  { id: 3, name: "Bulbasaur", image: bulbasaur, level: 5 },
];

const App: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [coinBalance, setCoinBalance] = useState<number>(100);
  const [ownedPokemons, setOwnedPokemons] = useState(initialPokemons);

  const handleLogout = () => setAccount(null);
  const handleStartMatch = () => alert("Starting match...");

  const canStartMatch = ownedPokemons.length >= 3;

  return (
    <Routes>
      {/* Redirect unauthenticated users */}
      <Route
        path="/"
        element={
          account ? (
            <Navigate to="/home" replace />
          ) : (
            <LoginPage onLogin={setAccount} />
          )
        }
      />
      <Route
        path="/home"
        element={
          account ? (
            <MainLayout
              account={account}
              coinBalance={coinBalance}
              onLogout={handleLogout}
            >
              <HomePage
                account={account}
                ownedPokemons={ownedPokemons}
                coinBalance={coinBalance}
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
              coinBalance={coinBalance}
              onLogout={handleLogout}
            >
              <MyPokemonPage ownedPokemons={ownedPokemons} />
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
              coinBalance={coinBalance}
              onLogout={handleLogout}
            >
              <MarketplacePage />
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
