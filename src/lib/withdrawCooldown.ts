// src/lib/withdrawCooldown.ts
export const WITHDRAW_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function key(address: string, chainId?: number) {
  return `pokemon-arena:withdraw:last:${chainId ?? "unknown"}:${address.toLowerCase()}`;
}

export function getLastWithdrawAt(address: string, chainId?: number): number | null {
  if (!address) return null;
  const raw = localStorage.getItem(key(address, chainId));
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function setLastWithdrawAt(address: string, chainId?: number, ts = Date.now()) {
  if (!address) return;
  localStorage.setItem(key(address, chainId), String(ts));
}

export function getCooldownRemainingMs(address: string, chainId?: number, now = Date.now()): number {
  const last = getLastWithdrawAt(address, chainId);
  if (!last) return 0;
  const end = last + WITHDRAW_COOLDOWN_MS;
  return Math.max(0, end - now);
}

export function formatDuration(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const pad = (x: number) => String(x).padStart(2, "0");
  return `${h}:${pad(m)}:${pad(s)}`;
}
