// src/hooks/useWithdrawCooldown.ts
import { useEffect, useMemo, useState } from "react";
import { formatDuration, getCooldownRemainingMs } from "@/lib/withdrawCooldown";

export function useWithdrawCooldown(address?: string, chainId?: number) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remainingMs = useMemo(() => {
    if (!address) return 0;
    return getCooldownRemainingMs(address, chainId, now);
  }, [address, chainId, now]);

  return {
    remainingMs,
    remainingText: formatDuration(remainingMs),
    isCoolingDown: remainingMs > 0,
  };
}
