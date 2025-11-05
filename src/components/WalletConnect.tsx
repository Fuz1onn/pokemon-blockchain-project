import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface WalletConnectProps {
  onConnect: (account: string | null) => void;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ onConnect }) => {
  const [account, setAccount] = useState<string | null>(null);

  const shortenAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("MetaMask not detected! Please install it to continue.");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      onConnect(accounts[0]);
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  };

  const switchAccount = async () => {
    try {
      if (!window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      onConnect(accounts[0]);
    } catch (error) {
      console.error("Failed to switch account:", error);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    onConnect(null);
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        const current = accounts[0] || null;
        setAccount(current);
        onConnect(current);
      });
    }
  }, [onConnect]);

  return (
    <div className="text-center space-y-3">
      {account ? (
        <>
          <p className="text-green-400 font-medium">
            Connected: {shortenAddress(account)}
          </p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={switchAccount}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Switch Account
            </button>
            <button
              onClick={disconnectWallet}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <button
          onClick={connectWallet}
          className="px-6 py-3 bg-yellow-500 text-gray-900 rounded-lg shadow-lg hover:bg-yellow-400 transition font-semibold"
        >
          Connect with MetaMask
        </button>
      )}
    </div>
  );
};

export default WalletConnect;
