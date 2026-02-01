import { ethers } from "ethers";
import { fetchLeelasNonce, getLeelasAddress, getLeelasContract, LEELAS_DECIMALS } from "./leelasUtils";

/**
 * Ultra-fast demo:
 * - user signs reward message with SAME wallet that claims
 * - contract verifies recovered signer == rewardSigner (set to same address)
 */
export async function claimLeelasReward(
  amountLeelas: number,
  userAddress: string
): Promise<{ txHash: string; amountWei: ethers.BigNumber }> {
  if (!window.ethereum) throw new Error("MetaMask not installed");

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();

  const network = await provider.getNetwork();
  if (network.chainId !== 11155111) {
    throw new Error("Please switch to Sepolia");
  }

  const amountWei = ethers.utils.parseUnits(String(amountLeelas), LEELAS_DECIMALS);
  const nonce = await fetchLeelasNonce(provider, userAddress);

  // must match Solidity:
  // keccak256(abi.encodePacked("LEELAS_REWARD", user, amount, nonce, chainId, contract))
  const messageHash = ethers.utils.solidityKeccak256(
    ["string", "address", "uint256", "uint256", "uint256", "address"],
    ["LEELAS_REWARD", userAddress, amountWei, nonce, network.chainId, getLeelasAddress()]
  );

  // signMessage applies the EIP-191 prefix -> matches MessageHashUtils.toEthSignedMessageHash
  const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));

  const c = getLeelasContract(signer);
  const tx = await c.claimReward(amountWei, nonce, signature);
  const receipt = await tx.wait();

  return { txHash: receipt.transactionHash, amountWei };
}
