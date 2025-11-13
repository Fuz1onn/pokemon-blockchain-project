export const baseEthByRarity: Record<string, number> = {
  Common: 0.01,
  Rare: 0.03,
  Epic: 0.08,
  Legendary: 0.2,
};

export const calculateEthPrice = (rarity: string, level: number): number => {
  const base = baseEthByRarity[rarity] || 0.01;
  const multiplier = 1 + level * 0.05; // 5% per level
  const variation = Math.random() * 0.02 - 0.01; // optional ±0.01 ETH
  return +(base * multiplier + variation).toFixed(5);
};
