import { ethers } from "ethers";
import leelasAddr from "@/contracts/leelas-address.json";

// OWNER-ONLY mint ABI
const LEELAS_ABI = ["function mint(address to, uint256 amount)"];

export async function withdrawLeelasToWallet(
  adminSigner: ethers.Signer,
  to: string,
  amountLeelas: number
) {
  const amountWei = ethers.utils.parseUnits(String(amountLeelas), 18);
  const c = new ethers.Contract(leelasAddr.address, LEELAS_ABI, adminSigner);
  const tx = await c.mint(to, amountWei);
  const receipt = await tx.wait();
  return receipt.transactionHash as string;
}
