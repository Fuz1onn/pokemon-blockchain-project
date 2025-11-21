import { ethers } from "ethers";
import contractAddress from "./contract-address.json";

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

export const getContract = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  return new ethers.Contract(contractAddress.address, CONTRACT_ABI, signer);
};

export const getContractReadOnly = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  return new ethers.Contract(contractAddress.address, CONTRACT_ABI, provider);
};

/**
 * Mint a new Pokemon NFT and optionally list it
 * Used when buying from General Marketplace
 */
export const mintAndBuyPokemon = async (
  userAddress: string,
  metadataUri: string,
  priceInEth: number
) => {
  try {
    const contract = await getContract();

    // Step 1: Mint the NFT to the buyer
    console.log("Minting Pokemon NFT...");
    const mintTx = await contract.mintPokemon(userAddress, metadataUri);
    const mintReceipt = await mintTx.wait();

    // Get token ID from event
    const event = mintReceipt.events?.find(
      (e: any) => e.event === "PokemonMinted"
    );
    const tokenId = event?.args?.[0]?.toString();

    if (!tokenId) {
      throw new Error("Failed to get token ID from mint transaction");
    }

    console.log("Pokemon minted! Token ID:", tokenId);

    return {
      success: true,
      transactionHash: mintReceipt.transactionHash,
      tokenId: parseInt(tokenId),
    };
  } catch (error: any) {
    console.error("Error minting Pokemon:", error);

    if (error.code === "ACTION_REJECTED") {
      throw new Error("Transaction rejected by user");
    } else if (error.message.includes("insufficient funds")) {
      throw new Error("Insufficient ETH balance");
    }

    throw new Error(error.message || "Failed to mint Pokemon");
  }
};

/**
 * Buy a listed Pokemon NFT (from Player Listings)
 */
export const buyListedPokemon = async (tokenId: number, priceInEth: number) => {
  try {
    const contract = await getContract();
    const priceInWei = ethers.utils.parseEther(priceInEth.toString());

    console.log("Buying Pokemon...", { tokenId, priceInEth });

    const tx = await contract.buyPokemon(tokenId, { value: priceInWei });
    const receipt = await tx.wait();

    return {
      success: true,
      transactionHash: receipt.transactionHash,
    };
  } catch (error: any) {
    console.error("Error buying Pokemon:", error);

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
 * List your owned Pokemon for sale
 */
export const listPokemon = async (tokenId: number, priceInEth: number) => {
  try {
    const contract = await getContract();
    const priceInWei = ethers.utils.parseEther(priceInEth.toString());

    const tx = await contract.listPokemon(tokenId, priceInWei);
    const receipt = await tx.wait();

    return {
      success: true,
      transactionHash: receipt.transactionHash,
    };
  } catch (error: any) {
    console.error("Error listing Pokemon:", error);
    throw new Error(error.message || "Failed to list Pokemon");
  }
};

/**
 * Get all listed Pokémon from the blockchain
 */
export const getAllListings = async (): Promise<any[]> => {
  try {
    const contract = await getContractReadOnly();

    // Note: You'll need to add a function to your smart contract
    // to return all active listings, or query events
    // For now, this is a placeholder

    // Placeholder: Query PokemonListed events
    const filter = contract.filters.PokemonListed();
    const events = await contract.queryFilter(filter);

    const listings = await Promise.all(
      events.map(async (event: any) => {
        const tokenId = event.args.tokenId.toNumber();
        try {
          const listing = await contract.getListing(tokenId);
          if (listing.isListed) {
            return {
              tokenId,
              seller: listing.seller,
              price: ethers.utils.formatEther(listing.price),
              isListed: listing.isListed,
            };
          }
        } catch (err) {
          console.error(`Error getting listing for token ${tokenId}:`, err);
        }
        return null;
      })
    );

    return listings.filter(Boolean);
  } catch (error) {
    console.error("Error fetching listings:", error);
    return [];
  }
};

/**
 * Get listing details
 */
export const getListing = async (tokenId: number) => {
  try {
    const contract = await getContractReadOnly();
    const listing = await contract.getListing(tokenId);

    return {
      tokenId: listing[0].toNumber(),
      seller: listing[1],
      price: ethers.utils.formatEther(listing[2]),
      isListed: listing[3],
    };
  } catch (error: any) {
    console.error("Error getting listing:", error);
    return null;
  }
};

/**
 * Cancel your listing
 */
export const cancelListing = async (tokenId: number) => {
  try {
    const contract = await getContract();
    const tx = await contract.cancelListing(tokenId);
    const receipt = await tx.wait();

    return {
      success: true,
      transactionHash: receipt.transactionHash,
    };
  } catch (error: any) {
    console.error("Error cancelling listing:", error);
    throw new Error(error.message || "Failed to cancel listing");
  }
};

/**
 * Check if connected to correct network
 */
export const checkNetwork = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const network = await provider.getNetwork();

  if (network.chainId !== 11155111) {
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

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const balance = await provider.getBalance(address);

  return ethers.utils.formatEther(balance);
};

export { contractAddress };
