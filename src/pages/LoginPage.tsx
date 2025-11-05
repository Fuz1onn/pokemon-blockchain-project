import React, { useState } from "react";
import WalletConnect from "../components/WalletConnect";

interface LoginPageProps {
  onLogin: (account: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [account, setAccount] = useState<string | null>(null);

  const handleConnect = (walletAddress: string | null) => {
    setAccount(walletAddress);
    if (walletAddress) onLogin(walletAddress);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <h1 className="text-5xl font-bold mb-6">Pokémon Arena</h1>
      <p className="text-lg text-gray-300 mb-8">
        {account
          ? "You're connected! Ready to enter the arena."
          : "Connect your wallet to start playing!"}
      </p>
      <WalletConnect onConnect={handleConnect} />
    </div>
  );
};

export default LoginPage;
