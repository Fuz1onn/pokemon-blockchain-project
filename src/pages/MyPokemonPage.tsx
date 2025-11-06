import React from "react";

interface Pokemon {
  id: number;
  name: string;
  image: string;
  level: number;
}

interface MyPokemonPageProps {
  ownedPokemons: Pokemon[];
}

const MyPokemonPage: React.FC<MyPokemonPageProps> = ({ ownedPokemons }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      <h2 className="text-3xl font-bold mb-6 text-yellow-400">My Pokémon</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {ownedPokemons.map((pokemon) => (
          <div
            key={pokemon.id}
            className="bg-gray-800 p-4 rounded-lg text-center shadow-md"
          >
            <img
              src={pokemon.image}
              alt={pokemon.name}
              className="mx-auto mb-2 w-24 h-24"
            />
            <h4 className="font-semibold">{pokemon.name}</h4>
            <p>Level: {pokemon.level}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyPokemonPage;
