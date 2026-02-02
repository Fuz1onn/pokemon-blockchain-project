import { ethers } from "ethers";
import leelasAddr from "./leelas-address.json";

export const LEELAS_DECIMALS = 18;

export const LEELAS_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function nonces(address) view returns (uint256)",
  "function claimReward(uint256 amount, uint256 nonce, bytes signature)",
];

export function getLeelasAddress(): string {
  return leelasAddr.address;
}

export function getLeelasContract(
  providerOrSigner: ethers.providers.Provider | ethers.Signer
) {
  return new ethers.Contract(getLeelasAddress(), LEELAS_ABI, providerOrSigner);
}

export async function fetchLeelasBalance(
  provider: ethers.providers.Web3Provider,
  user: string
): Promise<string> {
  const c = getLeelasContract(provider);
  const bal: ethers.BigNumber = await c.balanceOf(user);
  return ethers.utils.formatUnits(bal, LEELAS_DECIMALS);
}

export async function fetchLeelasNonce(
  provider: ethers.providers.Web3Provider,
  user: string
): Promise<ethers.BigNumber> {
  const c = getLeelasContract(provider);
  const nonce: ethers.BigNumber = await c.nonces(user);
  return nonce;
}
