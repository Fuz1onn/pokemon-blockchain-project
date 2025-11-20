import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Testing Sepolia connection...\n");

  try {
    // Test provider connection
    const network = await ethers.provider.getNetwork();
    console.log("✅ Connected to network:", network.name);
    console.log("   Chain ID:", network.chainId);

    // Get block number
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log("✅ Current block number:", blockNumber);

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("✅ Deployer address:", deployer.address);

    // Check balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("✅ Balance:", ethers.utils.formatEther(balance), "ETH");

    // Get gas price
    const gasPrice = await ethers.provider.getGasPrice();
    console.log(
      "✅ Gas price:",
      ethers.utils.formatUnits(gasPrice, "gwei"),
      "gwei"
    );

    console.log("\n🎉 Connection test successful!");
  } catch (error) {
    console.error("\n❌ Connection test failed:");
    console.error(error);
  }
}

main();
