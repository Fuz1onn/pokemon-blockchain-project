require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

// Validate environment variables
if (!process.env.PRIVATE_KEY) {
  console.error("❌ Error: PRIVATE_KEY not found in .env file");
  console.log("Please add your wallet private key to .env file");
  process.exit(1);
}

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155111,
      timeout: 60000, // 60 seconds timeout
      gasPrice: "auto", // Let network determine gas price
    },
    hardhat: {
      chainId: 31337,
    },
  },
};
