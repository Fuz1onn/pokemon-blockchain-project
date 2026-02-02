import { ethers } from "ethers";
import leelasAddress from "@/contracts/leelas-address.json";

export async function signLeelasReward(
  signer: ethers.Signer,
  user: string,
  amountWei: ethers.BigNumber,
  nonce: ethers.BigNumber,
  chainId: number
) {
  const messageHash = ethers.utils.solidityKeccak256(
    ["string", "address", "uint256", "uint256", "uint256", "address"],
    ["LEELAS_REWARD", user, amountWei, nonce, chainId, leelasAddress.address]
  );

  // signMessage expects bytes, and applies eth_sign prefix automatically
  const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));
  return signature;
}
