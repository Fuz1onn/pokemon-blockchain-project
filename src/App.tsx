import React, { useState } from "react";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";

// Import Pokémon GIF sprites
import pikachu from "./assets/pokemons/pikachu.gif";
import charmander from "./assets/pokemons/charmander.gif";
import bulbasaur from "./assets/pokemons/bulbasaur.gif";

// Define initial Pokémon owned by the player
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

  const handleStartMatch = () => {
    alert("Starting match...");
    // Add your battle logic here
  };

  const canStartMatch = ownedPokemons.length >= 3;

  return account ? (
    <HomePage
      account={account}
      ownedPokemons={ownedPokemons}
      coinBalance={coinBalance}
      onStartMatch={handleStartMatch}
      onLogout={handleLogout}
      canStartMatch={canStartMatch}
    />
  ) : (
    <LoginPage onLogin={setAccount} />
  );
};

export default App;
