import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const Leelas = await ethers.getContractFactory("LeelasToken");
  const leelas = await Leelas.deploy(deployer.address);
  await leelas.deployed();

  console.log("LeelasToken deployed to:", leelas.address);
  console.log("Owner:", deployer.address);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
