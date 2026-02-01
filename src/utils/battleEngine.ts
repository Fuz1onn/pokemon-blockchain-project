import { v4 as uuid } from "uuid";
import type { BattleMove, BattlePokemon, BattleResult, StandingRow } from "./battleTypes";

const MOVES: BattleMove[] = [
  { name: "Quick Strike", power: 14 },
  { name: "Heavy Slam", power: 22 },
  { name: "Power Burst", power: 18 },
  { name: "Focus Hit", power: 20 },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pickMove(): BattleMove {
  return MOVES[Math.floor(Math.random() * MOVES.length)];
}

function calcDamage(attacker: BattlePokemon, defender: BattlePokemon, move: BattleMove) {
  const levelFactor = 1 + attacker.level / 20;
  const atk = attacker.attack * levelFactor;
  const def = defender.defense * (1 + defender.level / 30);

  const raw = (atk * move.power) / (def + 25);
  const variance = 0.85 + Math.random() * 0.30;
  const dmg = Math.floor(raw * variance);

  return clamp(dmg, 3, 40);
}

export function simulateBattle(a: BattlePokemon, b: BattlePokemon): BattleResult {
  const matchId = uuid();
  const log: string[] = [];

  let aHP = a.hp;
  let bHP = b.hp;

  const maxRounds = 30;
  let rounds = 0;

  const aFirst = a.speed >= b.speed;
  const first = aFirst ? "A" : "B";

  log.push(`Match: ${a.name} vs ${b.name}`);
  log.push(`First: ${first === "A" ? a.name : b.name}`);

  while (aHP > 0 && bHP > 0 && rounds < maxRounds) {
    rounds++;

    const turn = rounds % 2 === 1 ? first : first === "A" ? "B" : "A";

    if (turn === "A") {
      const mv = pickMove();
      const dmg = calcDamage(a, b, mv);
      bHP = clamp(bHP - dmg, 0, 999999);
      log.push(`R${rounds}: ${a.name} used ${mv.name} (-${dmg}) → ${b.name} HP ${bHP}/${b.hp}`);
    } else {
      const mv = pickMove();
      const dmg = calcDamage(b, a, mv);
      aHP = clamp(aHP - dmg, 0, 999999);
      log.push(`R${rounds}: ${b.name} used ${mv.name} (-${dmg}) → ${a.name} HP ${aHP}/${a.hp}`);
    }
  }

  let winner: "A" | "B" | "DRAW" = "DRAW";
  if (bHP === 0 && aHP > 0) winner = "A";
  else if (aHP === 0 && bHP > 0) winner = "B";
  else winner = "DRAW";

  log.push(winner === "DRAW" ? "Result: DRAW" : `Result: ${winner === "A" ? a.name : b.name} WINS`);

  return { matchId, a, b, winner, rounds, log };
}

function emptyStanding(p: BattlePokemon): StandingRow {
  return {
    pokemonId: p.id,
    name: p.name,
    owner: p.owner,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    points: 0,
    hpDiff: 0,
  };
}

export function runRoundRobin(pool: BattlePokemon[]) {
  const standings = new Map<string, StandingRow>();
  pool.forEach((p) => standings.set(p.id, emptyStanding(p)));

  const results: BattleResult[] = [];

  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i];
      const b = pool[j];

      const res = simulateBattle(a, b);
      results.push(res);

      const rowA = standings.get(a.id)!;
      const rowB = standings.get(b.id)!;

      rowA.played++;
      rowB.played++;

      if (res.winner === "A") {
        rowA.wins++; rowA.points += 3; rowA.hpDiff += 10;
        rowB.losses++; rowB.hpDiff -= 10;
      } else if (res.winner === "B") {
        rowB.wins++; rowB.points += 3; rowB.hpDiff += 10;
        rowA.losses++; rowA.hpDiff -= 10;
      } else {
        rowA.draws++; rowB.draws++;
        rowA.points += 1; rowB.points += 1;
      }
    }
  }

  const table = Array.from(standings.values()).sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    return y.hpDiff - x.hpDiff;
  });

  return { table, results };
}
