export function getPendingLeelasKey(address: string) {
  return `pendingLeelas_${address.toLowerCase()}`;
}

export function getPendingLeelas(address: string): number {
  const raw = localStorage.getItem(getPendingLeelasKey(address));
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function addPendingLeelas(address: string, amount: number) {
  const current = getPendingLeelas(address);
  const next = current + amount;
  localStorage.setItem(getPendingLeelasKey(address), String(next));
  return next;
}

export function clearPendingLeelas(address: string) {
  localStorage.setItem(getPendingLeelasKey(address), "0");
}
