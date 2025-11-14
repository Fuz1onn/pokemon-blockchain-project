// Current ETH price in USD (update this dynamically if needed)
const ETH_USD_RATE = 2000; // 1 ETH = $2000

// Base USD price ranges for each rarity
const baseUsdByRarity: Record<string, [number, number]> = {
  Common: [1, 5],
  Rare: [5, 15],
  Epic: [15, 40],
  Legendary: [40, 100],
};

/**
 * Calculate USD price based on rarity and level.
 * Higher levels push price closer to the max of the range.
 */
export const calculateUsdPrice = (rarity: string, level: number): number => {
  const range = baseUsdByRarity[rarity] || [1, 5];
  const [min, max] = range;

  // Normalize level to 1–30
  const normalizedLevel = Math.min(Math.max(level, 1), 30);

  // Linear interpolation based on level
  const price = min + ((max - min) * normalizedLevel) / 30;

  // Optional small random variation ±5%
  const variation = price * (Math.random() * 0.1 - 0.05);

  return +(price + variation).toFixed(2);
};

/**
 * Convert USD price to ETH
 */
export const usdToEth = (usdPrice: number): number => {
  return +(usdPrice / ETH_USD_RATE).toFixed(5);
};

/**
 * Calculate both ETH and USD prices for display
 */
export const calculateEthPrice = (rarity: string, level: number) => {
  const usdPrice = calculateUsdPrice(rarity, level);
  const ethPrice = usdToEth(usdPrice);
  return { usd: usdPrice, eth: ethPrice };
};
