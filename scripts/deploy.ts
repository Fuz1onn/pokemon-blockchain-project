import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");

  const PokemonNFT = await ethers.getContractFactory("PokemonNFT");
  const pokemonNFT = await PokemonNFT.deploy(deployer.address);
  await pokemonNFT.deployed();

  console.log("PokemonNFT deployed to:", pokemonNFT.address);

  fs.writeFileSync(
    "./src/contracts/contract-address.json",
    JSON.stringify(
      { address: pokemonNFT.address, network: "sepolia", chainId: 11155111 },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
