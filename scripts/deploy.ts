import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Starting deployment to Sepolia...\n");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceInEth = ethers.utils.formatEther(balance);
  console.log("💰 Account balance:", balanceInEth, "ETH");

  if (parseFloat(balanceInEth) < 0.01) {
    console.warn("⚠️  Warning: Low balance. You may need more SepoliaETH");
    console.log("   Get free SepoliaETH from: https://sepoliafaucet.com/");
  }

  // Get current gas price
  const gasPrice = await ethers.provider.getGasPrice();
  console.log(
    "⛽ Current gas price:",
    ethers.utils.formatUnits(gasPrice, "gwei"),
    "gwei\n"
  );

  // Deploy contract
  console.log("📝 Deploying PokemonNFT contract...");
  const PokemonNFT = await ethers.getContractFactory("PokemonNFT");

  const pokemonNFT = await PokemonNFT.deploy(deployer.address, {
    gasLimit: 3000000, // Set explicit gas limit
  });

  console.log("⏳ Waiting for deployment transaction...");
  await pokemonNFT.deployed();

  console.log("\n✅ PokemonNFT deployed successfully!");
  console.log("📍 Contract address:", pokemonNFT.address);
  console.log(
    "🔗 View on Etherscan:",
    `https://sepolia.etherscan.io/address/${pokemonNFT.address}`
  );

  // Save contract address
  const contractDir = path.join(__dirname, "..", "src", "contracts");
  if (!fs.existsSync(contractDir)) {
    fs.mkdirSync(contractDir, { recursive: true });
  }

  const contractData = {
    address: pokemonNFT.address,
    network: "sepolia",
    chainId: 11155111,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(contractDir, "contract-address.json"),
    JSON.stringify(contractData, null, 2)
  );

  console.log(
    "\n💾 Contract address saved to src/contracts/contract-address.json"
  );

  // Wait for block confirmations
  console.log("\n⏳ Waiting for 5 block confirmations...");
  await pokemonNFT.deployTransaction.wait(5);
  console.log("✅ Deployment confirmed!");

  // Optional: Verify contract
  // if (process.env.ETHERSCAN_API_KEY) {
  //   console.log("\n📋 To verify contract on Etherscan, run:");
  //   console.log(`npx hardhat verify --network sepolia ${pokemonNFT.address} "${deployer.address}"`);
  // }

  console.log("\n🎉 Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
