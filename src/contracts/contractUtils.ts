import { ethers } from "ethers";
import contractAddress from "./contract-address.json";

// Contract ABI - only the functions we need
const CONTRACT_ABI = [
  "function mintPokemon(address to, string memory uri) public returns (uint256)",
  "function listPokemon(uint256 tokenId, uint256 price) public",
  "function buyPokemon(uint256 tokenId) public payable",
  "function cancelListing(uint256 tokenId) public",
  "function getListing(uint256 tokenId) public view returns (tuple(uint256 tokenId, address seller, uint256 price, bool isListed))",
  "function isListed(uint256 tokenId) public view returns (bool)",
  "function ownerOf(uint256 tokenId) public view returns (address)",
  "function tokenURI(uint256 tokenId) public view returns (string)",
  "event PokemonMinted(uint256 indexed tokenId, address indexed owner, string tokenURI)",
  "event PokemonListed(uint256 indexed tokenId, address indexed seller, uint256 price)",
  "event PokemonSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price)",
];

/**
 * Get contract instance with signer
 */
export const getContract = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  return new ethers.Contract(contractAddress.address, CONTRACT_ABI, signer);
};

/**
 * Get contract instance with provider (read-only)
 */
export const getContractReadOnly = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);

  return new ethers.Contract(contractAddress.address, CONTRACT_ABI, provider);
};

/**
 * Buy a Pokemon NFT
 */
export const buyPokemon = async (tokenId: string, priceInEth: number) => {
  try {
    const contract = await getContract();
    const priceInWei = ethers.parseEther(priceInEth.toString());

    // Call buyPokemon function with the price as value
    const tx = await contract.buyPokemon(tokenId, { value: priceInWei });

    console.log("Transaction sent:", tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();

    console.log("Transaction confirmed:", receipt.hash);

    return {
      success: true,
      transactionHash: receipt.hash,
    };
  } catch (error: any) {
    console.error("Error buying Pokemon:", error);

    // Handle specific errors
    if (error.code === "ACTION_REJECTED") {
      throw new Error("Transaction rejected by user");
    } else if (error.message.includes("insufficient funds")) {
      throw new Error("Insufficient ETH balance");
    } else if (error.message.includes("Pokemon not listed")) {
      throw new Error("This Pokemon is no longer available");
    }

    throw new Error(error.message || "Failed to buy Pokemon");
  }
};

/**
 * Mint a new Pokemon NFT (for marketplace listings)
 */
export const mintPokemon = async (to: string, metadataUri: string) => {
  try {
    const contract = await getContract();
    const tx = await contract.mintPokemon(to, metadataUri);

    console.log("Minting transaction sent:", tx.hash);

    const receipt = await tx.wait();

    // Get token ID from event
    const event = receipt.logs.find((log: any) => {
      try {
        return contract.interface.parseLog(log)?.name === "PokemonMinted";
      } catch {
        return false;
      }
    });

    let tokenId = null;
    if (event) {
      const parsedEvent = contract.interface.parseLog(event);
      tokenId = parsedEvent?.args[0].toString();
    }

    return {
      success: true,
      transactionHash: receipt.hash,
      tokenId,
    };
  } catch (error: any) {
    console.error("Error minting Pokemon:", error);
    throw new Error(error.message || "Failed to mint Pokemon");
  }
};

/**
 * List a Pokemon for sale
 */
export const listPokemon = async (tokenId: string, priceInEth: number) => {
  try {
    const contract = await getContract();
    const priceInWei = ethers.parseEther(priceInEth.toString());

    const tx = await contract.listPokemon(tokenId, priceInWei);

    console.log("Listing transaction sent:", tx.hash);

    const receipt = await tx.wait();

    return {
      success: true,
      transactionHash: receipt.hash,
    };
  } catch (error: any) {
    console.error("Error listing Pokemon:", error);
    throw new Error(error.message || "Failed to list Pokemon");
  }
};

/**
 * Get listing details
 */
export const getListing = async (tokenId: string) => {
  try {
    const contract = await getContractReadOnly();
    const listing = await contract.getListing(tokenId);

    return {
      tokenId: listing[0].toString(),
      seller: listing[1],
      price: ethers.formatEther(listing[2]),
      isListed: listing[3],
    };
  } catch (error: any) {
    console.error("Error getting listing:", error);
    return null;
  }
};

/**
 * Check if connected to correct network
 */
export const checkNetwork = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();

  // Sepolia chainId is 11155111
  if (network.chainId !== BigInt(11155111)) {
    throw new Error("Please switch to Sepolia network in MetaMask");
  }

  return true;
};

/**
 * Get user's ETH balance
 */
export const getEthBalance = async (address: string) => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const balance = await provider.getBalance(address);

  return ethers.formatEther(balance);
};

export { contractAddress };
