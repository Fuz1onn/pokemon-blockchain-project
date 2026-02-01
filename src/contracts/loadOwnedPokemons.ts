import { ethers } from "ethers";
import { CONTRACT_ABI } from "./contractUtils";
import contractAddress from "./contract-address.json";

export async function loadOwnedPokemons(address: string) {
  if (!window.ethereum) throw new Error("MetaMask not installed");

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const contract = new ethers.Contract(
    contractAddress.address,
    CONTRACT_ABI,
    provider
  );

  const filter = contract.filters.PokemonMinted(null, address);
  const events = await contract.queryFilter(filter);

  const owned = [];

  for (const e of events) {
    const tokenId = e.args?.tokenId.toNumber();

    // verify ownership (important!)
    const owner = await contract.ownerOf(tokenId);
    if (owner.toLowerCase() !== address.toLowerCase()) continue;

    const uri = await contract.tokenURI(tokenId);
    const base64 = uri.split(",")[1];
    const json = JSON.parse(atob(base64));

    owned.push({
      tokenId,
      name: json.name,
      image: json.image,
      level: Number(
        json.attributes.find((a: any) => a.trait_type === "Level")?.value ?? 1
      ),
      rarity:
        json.attributes.find((a: any) => a.trait_type === "Rarity")?.value ??
        "Common",
      stats: {
        hp: Number(json.attributes.find((a: any) => a.trait_type === "HP")?.value),
        attack: Number(
          json.attributes.find((a: any) => a.trait_type === "Attack")?.value
        ),
        defense: Number(
          json.attributes.find((a: any) => a.trait_type === "Defense")?.value
        ),
        speed: Number(
          json.attributes.find((a: any) => a.trait_type === "Speed")?.value
        ),
      },
    });
  }

  return owned;
}
