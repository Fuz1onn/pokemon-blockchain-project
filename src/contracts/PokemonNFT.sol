// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PokemonNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    struct PokemonListing {
        uint256 tokenId;
        address seller;
        uint256 price;
        bool isListed;
    }

    // Mapping from tokenId to listing
    mapping(uint256 => PokemonListing) public listings;

    // Events
    event PokemonMinted(uint256 indexed tokenId, address indexed owner, string tokenURI);
    event PokemonListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event PokemonSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);

    constructor(address initialOwner) ERC721("PokemonNFT", "PKMN") Ownable(initialOwner) {}

    /**
     * @dev Mint a new Pokemon NFT
     * @param to Address to mint the NFT to
     * @param uri Metadata URI for the Pokemon
     */
    function mintPokemon(address to, string memory uri) public returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        emit PokemonMinted(tokenId, to, uri);
        return tokenId;
    }

    /**
     * @dev List a Pokemon for sale
     * @param tokenId Token ID to list
     * @param price Price in wei
     */
    function listPokemon(uint256 tokenId, uint256 price) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(price > 0, "Price must be greater than 0");
        require(!listings[tokenId].isListed, "Already listed");

        listings[tokenId] = PokemonListing({
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            isListed: true
        });

        emit PokemonListed(tokenId, msg.sender, price);
    }

    /**
     * @dev Buy a listed Pokemon
     * @param tokenId Token ID to buy
     */
    function buyPokemon(uint256 tokenId) public payable {
        PokemonListing memory listing = listings[tokenId];
        
        require(listing.isListed, "Pokemon not listed");
        require(msg.value >= listing.price, "Insufficient payment");
        require(msg.sender != listing.seller, "Cannot buy your own Pokemon");

        // Transfer ownership
        _transfer(listing.seller, msg.sender, tokenId);

        // Transfer payment to seller
        (bool sent, ) = payable(listing.seller).call{value: listing.price}("");
        require(sent, "Failed to send payment");

        // Refund excess payment
        if (msg.value > listing.price) {
            (bool refunded, ) = payable(msg.sender).call{value: msg.value - listing.price}("");
            require(refunded, "Failed to refund excess");
        }

        // Remove listing
        delete listings[tokenId];

        emit PokemonSold(tokenId, listing.seller, msg.sender, listing.price);
    }

    /**
     * @dev Cancel a listing
     * @param tokenId Token ID to cancel listing
     */
    function cancelListing(uint256 tokenId) public {
        require(listings[tokenId].seller == msg.sender, "Not the seller");
        require(listings[tokenId].isListed, "Not listed");

        delete listings[tokenId];
        emit ListingCancelled(tokenId, msg.sender);
    }

    /**
     * @dev Get listing details
     * @param tokenId Token ID to query
     */
    function getListing(uint256 tokenId) public view returns (PokemonListing memory) {
        return listings[tokenId];
    }

    /**
     * @dev Check if a Pokemon is listed
     * @param tokenId Token ID to check
     */
    function isListed(uint256 tokenId) public view returns (bool) {
        return listings[tokenId].isListed;
    }

    // Override required functions
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}