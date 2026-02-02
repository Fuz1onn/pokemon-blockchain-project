import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pokemonSkills } from "@/utils/pokemonSkills";

type OwnedPokemon = {
  tokenId?: number;
  id?: number;
  name: string;
  image: string;
  level: number;
  rarity?: "Common" | "Rare" | "Epic" | "Legendary" | string;
  stats?: { hp: number; attack: number; defense: number; speed: number };
  hp?: number;
  attack?: number;
  defense?: number;
  speed?: number;
};

type Props = {
  ownedPokemons: OwnedPokemon[];
  onEarnLeelas: (amount: number) => void;
};

// ✅ Match pokemonSkills.ts shape
type Skill = {
  id: string;
  name: string;
  type: string;
  power: number;
  accuracy: number; // 0..1
  ppMax: number;
};

type ArenaPokemon = {
  id: string;
  name: string;
  image: string | null;
  rarity: string;
  level: number;

  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;

  skills: Skill[];
  pp: Record<string, number>; // skillId -> pp remaining
  owner: "PLAYER" | "AI";
  fainted: boolean;
};

type Side = "player" | "ai";

type Phase =
  | "lineup"
  | "match_intro"
  | "player_turn"
  | "ai_turn"
  | "resolving"
  | "match_over"
  | "battle_over";

type CommandMode = "root" | "fight";

type State = {
  phase: Phase;
  selectedIds: Set<string>;

  playerTeam: ArenaPokemon[];
  aiTeam: ArenaPokemon[];

  matchIndex: number; // 0..2
  turn: Side;

  lastDamage?: { target: Side; amount: number; skillName: string };
  dialogue: string;

  playerMatchWins: number;
  aiMatchWins: number;

  lastEarned: number;

  // ✅ Match done indicator
  toast: { text: string; id: number } | null;

  // ✅ Option C command mode
  commandMode: CommandMode;
};

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// -----------------------------
// pokemonSkills.ts adapter
// -----------------------------
function normalizeName(name: string) {
  return name
    .replace(/\s+/g, "")
    .replace(/[’'".,-]/g, "")
    .replace(/♀/g, "F")
    .replace(/♂/g, "M")
    .toLowerCase();
}

function getSkillsForPokemon(pokemonName: string): Skill[] {
  const table = pokemonSkills as any;
  const keys = Object.keys(table ?? {});

  const toSkill = (m: any, keyName: string, idx: number): Skill => ({
    id: `${keyName}-${m.name}`.toLowerCase().replace(/\s+/g, "-"),
    name: String(m.name ?? `Move ${idx + 1}`),
    type: String(m.type ?? "Normal"),
    power: Number(m.power ?? 40),
    accuracy: clamp(Number(m.accuracy ?? 100) / 100, 0, 1),
    ppMax: Math.max(1, Number(m.pp ?? 5)),
  });

  const direct = table?.[pokemonName];
  if (Array.isArray(direct) && direct.length) {
    return direct
      .slice(0, 4)
      .map((m: any, idx: number) => toSkill(m, pokemonName, idx));
  }

  const target = normalizeName(pokemonName);
  const foundKey = keys.find((k) => normalizeName(k) === target);
  if (foundKey && Array.isArray(table?.[foundKey])) {
    return table[foundKey]
      .slice(0, 4)
      .map((m: any, idx: number) => toSkill(m, foundKey, idx));
  }

  return [
    {
      id: "tackle",
      name: "Tackle",
      type: "Normal",
      power: 40,
      accuracy: 1,
      ppMax: 8,
    },
    {
      id: "quick-attack",
      name: "Quick Attack",
      type: "Normal",
      power: 40,
      accuracy: 1,
      ppMax: 6,
    },
    {
      id: "slam",
      name: "Slam",
      type: "Normal",
      power: 70,
      accuracy: 0.9,
      ppMax: 5,
    },
    {
      id: "hyper-beam",
      name: "Hyper Beam",
      type: "Normal",
      power: 90,
      accuracy: 0.85,
      ppMax: 3,
    },
  ];
}

// -----------------------------
// Convert OwnedPokemon -> ArenaPokemon
// -----------------------------
function toArenaPokemon(p: OwnedPokemon, owner: "PLAYER" | "AI"): ArenaPokemon {
  const lvl = Number(p.level ?? 1);

  const maxHp = Number(p?.stats?.hp ?? p?.hp ?? 60 + lvl * 8);
  const attack = Number(p?.stats?.attack ?? p?.attack ?? 25 + lvl * 5);
  const defense = Number(p?.stats?.defense ?? p?.defense ?? 20 + lvl * 4);
  const speed = Number(p?.stats?.speed ?? p?.speed ?? 20 + lvl * 4);

  const id = `${owner === "PLAYER" ? "player" : "ai"}-${p.tokenId ?? p.id ?? p.name}`;

  const skills = getSkillsForPokemon(p.name).slice(0, 4);
  const pp = Object.fromEntries(skills.map((s) => [s.id, s.ppMax])) as Record<
    string,
    number
  >;

  return {
    id,
    name: p.name,
    image: p.image ?? null,
    rarity: String(p.rarity ?? "Common"),
    level: lvl,

    maxHp,
    hp: maxHp,
    attack,
    defense,
    speed,

    skills,
    pp,
    owner,
    fainted: false,
  };
}

// -----------------------------
// Damage + AI
// -----------------------------
function computeDamage(
  attacker: ArenaPokemon,
  defender: ArenaPokemon,
  skill: Skill,
) {
  const variance = randInt(0, 6);
  const base =
    attacker.attack + skill.power * 0.55 - defender.defense * 0.6 + variance;
  return Math.max(1, Math.floor(base));
}

function pickAiSkill(ai: ArenaPokemon, player: ArenaPokemon) {
  const usable = ai.skills.filter((s) => (ai.pp?.[s.id] ?? 0) > 0);
  const pool = usable.length ? usable : ai.skills;

  const scored = pool.map((s) => ({
    s,
    score: computeDamage(ai, player, s) + randInt(0, 5),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.s ?? pool[0];
}

// -----------------------------
// State init
// -----------------------------
function initialState(): State {
  return {
    phase: "lineup",
    selectedIds: new Set(),

    playerTeam: [],
    aiTeam: [],

    matchIndex: 0,
    turn: "player",

    dialogue: "Choose your lineup.",
    lastDamage: undefined,

    playerMatchWins: 0,
    aiMatchWins: 0,

    lastEarned: 0,
    toast: null,

    commandMode: "root",
  };
}

// -----------------------------
// UI components
// -----------------------------
function Hud({
  name,
  level,
  hp,
  maxHp,
  side,
}: {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  side: "enemy" | "player";
}) {
  const pct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
  const w = `${clamp(pct, 0, 100)}%`;
  const bar =
    pct > 60 ? "bg-emerald-400" : pct > 30 ? "bg-yellow-400" : "bg-rose-400";

  return (
    <div
      className={[
        "w-[270px] sm:w-[330px] rounded-[16px]",
        "bg-black/55 border-2 border-white/20 backdrop-blur",
        "px-4 py-3 shadow-[0_16px_44px_rgba(0,0,0,0.6)]",
        side === "enemy" ? "rounded-tr-[24px]" : "rounded-bl-[24px]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm sm:text-base font-extrabold tracking-wide">
            {name}
          </div>
          <div className="text-[11px] text-white/70">Lv {level}</div>
        </div>
        <div className="text-[11px] text-white/70 tabular-nums">
          {hp}/{maxHp}
        </div>
      </div>

      <div className="mt-2">
        <div className="h-[10px] w-full rounded-full bg-white/15 overflow-hidden ring-1 ring-black/30">
          <div className={`h-full ${bar}`} style={{ width: w }} />
        </div>
      </div>
    </div>
  );
}

function BattleDialogue({ text }: { text: string }) {
  return (
    <div className="rounded-[18px] border-4 border-neutral-200/70 bg-neutral-950/70 shadow-[0_14px_40px_rgba(0,0,0,0.55)]">
      <div className="rounded-[12px] border border-white/10 bg-neutral-900/60 px-5 py-4 backdrop-blur">
        <div className="text-sm sm:text-base font-semibold tracking-wide text-white">
          {text}
        </div>
      </div>
    </div>
  );
}

function Platform({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <div
      className={[
        "relative rounded-[999px]",
        size === "sm"
          ? "h-[86px] w-[250px] sm:w-[300px]"
          : "h-[110px] w-[290px] sm:w-[360px]",
        "bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.18),rgba(255,255,255,0.02)_55%,rgba(0,0,0,0.35)_100%)]",
        "border border-white/15",
        "shadow-[0_30px_60px_rgba(0,0,0,0.65)]",
        "backdrop-blur-[2px]",
      ].join(" ")}
    >
      <div className="absolute inset-0 rounded-[999px] ring-1 ring-white/10" />
    </div>
  );
}

const BattleArenaPage: React.FC<Props> = ({ ownedPokemons, onEarnLeelas }) => {
  const [state, setState] = React.useState<State>(() => initialState());

  const ownedWithStableId = React.useMemo(() => {
    return ownedPokemons.map((p) => ({
      ...p,
      _sid: `owned-${p.tokenId ?? p.id ?? p.name}`,
    }));
  }, [ownedPokemons]);

  const canStart = state.selectedIds.size === 3;

  const activePlayer = state.playerTeam[state.matchIndex];
  const activeAi = state.aiTeam[state.matchIndex];

  function setDialogue(text: string) {
    setState((p) => ({ ...p, dialogue: text }));
  }

  function showToast(text: string) {
    const id = Date.now();
    setState((p) => ({ ...p, toast: { text, id } }));
    window.setTimeout(() => {
      setState((p) => (p.toast?.id === id ? { ...p, toast: null } : p));
    }, 1400);
  }

  function toggleSelect(sid: string) {
    setState((prev) => {
      const next = new Set(prev.selectedIds);
      if (next.has(sid)) next.delete(sid);
      else {
        if (next.size >= 3) return prev;
        next.add(sid);
      }
      return { ...prev, selectedIds: next };
    });
  }

  function buildAiTeamFromRoster(): OwnedPokemon[] {
    const pool = [...ownedPokemons];
    const aiPick: OwnedPokemon[] = [];
    while (aiPick.length < 3 && pool.length > 0) {
      const idx = randInt(0, pool.length - 1);
      aiPick.push(pool.splice(idx, 1)[0]);
    }

    while (aiPick.length < 3) {
      aiPick.push({
        name: `AI Bot ${aiPick.length + 1}`,
        image: "",
        level: 1,
        rarity: "Common",
        stats: { hp: 80, attack: 30, defense: 20, speed: 20 },
      });
    }
    return aiPick;
  }

  function startBattle() {
    const chosen = ownedWithStableId
      .filter((p) => state.selectedIds.has(p._sid))
      .slice(0, 3);

    const playerTeam = chosen.map((p) => toArenaPokemon(p, "PLAYER"));

    const aiRaw = buildAiTeamFromRoster();
    const aiTeam = aiRaw.map((p) =>
      toArenaPokemon(
        { ...p, name: p.name || "AI Pokémon", image: p.image || "" },
        "AI",
      ),
    );

    const p0 = playerTeam[0];
    const a0 = aiTeam[0];
    const turn: Side = p0.speed >= a0.speed ? "player" : "ai";

    setState((prev) => ({
      ...prev,
      phase: "match_intro",
      playerTeam,
      aiTeam,
      matchIndex: 0,
      turn,
      dialogue: `Match 1/3 begins! ${turn === "player" ? "You" : "Enemy"} go first.`,
      playerMatchWins: 0,
      aiMatchWins: 0,
      lastDamage: undefined,
      lastEarned: 0,
      toast: null,
      commandMode: "root",
    }));

    setTimeout(() => {
      setState((p) => ({
        ...p,
        phase: turn === "player" ? "player_turn" : "ai_turn",
      }));
      if (turn === "player")
        setDialogue(`What will ${playerTeam[0]?.name ?? "your Pokémon"} do?`);
      else setDialogue(`Enemy ${aiTeam[0]?.name ?? "Pokémon"} is thinking…`);
    }, 250);
  }

  function resetBattle() {
    setState(initialState());
  }

  function endTournament(playerWins: number, aiWins: number) {
    const draws = 3 - (playerWins + aiWins);
    const baseEarned = playerWins * 5 + draws * 2;
    const championBonus = playerWins > aiWins ? 20 : 0;
    const total = baseEarned + championBonus;

    if (total > 0) onEarnLeelas(total);

    setState((prev) => ({
      ...prev,
      phase: "battle_over",
      lastEarned: total,
      dialogue:
        playerWins > aiWins
          ? "You won the tournament!"
          : playerWins < aiWins
            ? "You lost the tournament…"
            : "Tournament ended in a draw.",
      commandMode: "root",
    }));

    showToast(
      playerWins > aiWins
        ? "Tournament Won!"
        : playerWins < aiWins
          ? "Tournament Lost"
          : "Tournament Draw",
    );
  }

  function nextMatchOrEnd() {
    setState((prev) => {
      const nextIndex = prev.matchIndex + 1;
      if (nextIndex >= 3) return prev;

      const pNext = prev.playerTeam[nextIndex];
      const aNext = prev.aiTeam[nextIndex];
      const turn: Side = pNext.speed >= aNext.speed ? "player" : "ai";

      return {
        ...prev,
        phase: "match_intro",
        matchIndex: nextIndex,
        turn,
        lastDamage: undefined,
        dialogue: `Match ${nextIndex + 1}/3 begins! ${turn === "player" ? "You" : "Enemy"} go first.`,
        commandMode: "root",
      };
    });

    setTimeout(() => {
      setState((p) => ({
        ...p,
        phase: p.turn === "player" ? "player_turn" : "ai_turn",
      }));
      setState((p) => {
        const mi = p.matchIndex;
        const pl = p.playerTeam[mi];
        const en = p.aiTeam[mi];
        const text =
          p.turn === "player"
            ? `What will ${pl?.name ?? "your Pokémon"} do?`
            : `Enemy ${en?.name ?? "Pokémon"} is thinking…`;
        return { ...p, dialogue: text, commandMode: "root" };
      });
    }, 350);
  }

  function resolveAttack(attackerSide: Side, skill: Skill) {
    // Lock UI to root during resolving
    setState((p) => ({ ...p, commandMode: "root" }));

    setState((prev) => {
      const mi = prev.matchIndex;
      const player = prev.playerTeam[mi];
      const ai = prev.aiTeam[mi];
      if (!player || !ai) return prev;

      const attacker = attackerSide === "player" ? player : ai;

      const usable = attacker.skills.filter(
        (s) => (attacker.pp?.[s.id] ?? 0) > 0,
      );
      const chosen =
        (attacker.pp?.[skill.id] ?? 0) > 0
          ? skill
          : (usable[0] ?? attacker.skills[0]);

      const attackerLabel =
        attackerSide === "player" ? attacker.name : `Enemy ${attacker.name}`;
      return {
        ...prev,
        phase: "resolving",
        dialogue: `${attackerLabel} used ${chosen.name}!`,
      };
    });

    window.setTimeout(() => {
      setState((prev) => {
        const mi = prev.matchIndex;
        const player = prev.playerTeam[mi];
        const ai = prev.aiTeam[mi];
        if (!player || !ai) return prev;

        const attacker = attackerSide === "player" ? player : ai;
        const defender = attackerSide === "player" ? ai : player;

        const chosen =
          attacker.skills.find((s) => s.id === skill.id) ??
          attacker.skills.find((s) => (attacker.pp?.[s.id] ?? 0) > 0) ??
          attacker.skills[0];

        const hit = Math.random() <= clamp(chosen.accuracy ?? 1, 0, 1);

        let dmg = 0;
        let newDefender = defender;

        if (hit) {
          dmg = computeDamage(attacker, defender, chosen);
          const nextHp = Math.max(0, defender.hp - dmg);
          newDefender = { ...defender, hp: nextHp, fainted: nextHp <= 0 };
        }

        const nextPP = { ...attacker.pp };
        nextPP[chosen.id] = Math.max(0, (nextPP[chosen.id] ?? 0) - 1);
        const attackerAfter = { ...attacker, pp: nextPP };

        const playerTeam = [...prev.playerTeam];
        const aiTeam = [...prev.aiTeam];

        if (attackerSide === "player") {
          playerTeam[mi] = attackerAfter;
          aiTeam[mi] = newDefender;
        } else {
          aiTeam[mi] = attackerAfter;
          playerTeam[mi] = newDefender;
        }

        const target: Side = attackerSide === "player" ? "ai" : "player";

        const followText = hit
          ? `${newDefender.name} took ${dmg} damage!`
          : "But it missed!";

        return {
          ...prev,
          playerTeam,
          aiTeam,
          lastDamage: { target, amount: dmg, skillName: chosen.name },
          dialogue: followText,
          phase: "resolving",
        };
      });

      window.setTimeout(() => {
        setState((prev) => {
          const mi = prev.matchIndex;
          const pl = prev.playerTeam[mi];
          const en = prev.aiTeam[mi];
          if (!pl || !en) return prev;

          const playerFainted = pl.hp <= 0;
          const aiFainted = en.hp <= 0;

          if (playerFainted || aiFainted) {
            const winner: Side | "draw" =
              playerFainted && aiFainted
                ? "draw"
                : playerFainted
                  ? "ai"
                  : "player";

            const matchNo = mi + 1;

            const playerMatchWins =
              winner === "player"
                ? prev.playerMatchWins + 1
                : prev.playerMatchWins;
            const aiMatchWins =
              winner === "ai" ? prev.aiMatchWins + 1 : prev.aiMatchWins;

            let toastText = "";
            let dialogueText = "";

            if (winner === "draw") {
              toastText = `Match ${matchNo} Draw`;
              dialogueText = `Match ${matchNo} ended in a draw!`;
            } else if (winner === "player") {
              toastText = `Match ${matchNo} Won!`;
              dialogueText = `You won Match ${matchNo}!`;
            } else {
              toastText = `Match ${matchNo} Lost`;
              dialogueText = `You lost Match ${matchNo}…`;
            }

            showToast(toastText);

            const updated: State = {
              ...prev,
              phase: "match_over",
              playerMatchWins,
              aiMatchWins,
              dialogue: dialogueText,
              commandMode: "root",
            };

            if (mi >= 2) {
              window.setTimeout(
                () => endTournament(playerMatchWins, aiMatchWins),
                500,
              );
              return updated;
            }

            window.setTimeout(() => nextMatchOrEnd(), 650);
            return updated;
          }

          const nextTurn: Side = attackerSide === "player" ? "ai" : "player";
          const nextDialogue =
            nextTurn === "player"
              ? `What will ${pl.name} do?`
              : `Enemy ${en.name} is thinking…`;

          return {
            ...prev,
            phase: nextTurn === "player" ? "player_turn" : "ai_turn",
            turn: nextTurn,
            dialogue: nextDialogue,
            commandMode: "root",
          };
        });
      }, 550);
    }, 420);
  }

  // Auto-play AI turn
  React.useEffect(() => {
    if (state.phase !== "ai_turn") return;
    const mi = state.matchIndex;
    const ai = state.aiTeam[mi];
    const player = state.playerTeam[mi];
    if (!ai || !player) return;

    const chosen = pickAiSkill(ai, player);
    const t = window.setTimeout(() => resolveAttack("ai", chosen), 700);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.matchIndex]);

  function playerUseSkill(skill: Skill) {
    if (state.phase !== "player_turn") return;
    resolveAttack("player", skill);
  }

  // -----------------------------
  // Option C command actions
  // -----------------------------
  const isBattleLocked =
    state.phase === "ai_turn" ||
    state.phase === "resolving" ||
    state.phase === "match_intro" ||
    state.phase === "match_over" ||
    state.phase === "battle_over";

  function openFight() {
    if (state.phase !== "player_turn") {
      showToast("Not your turn!");
      return;
    }
    setState((p) => ({ ...p, commandMode: "fight" }));
    setDialogue(`Choose a move.`);
  }

  function backToRoot() {
    setState((p) => ({ ...p, commandMode: "root" }));
    if (state.phase === "player_turn") {
      setDialogue(`What will ${activePlayer?.name ?? "your Pokémon"} do?`);
    }
  }

  function comingSoon(label: string) {
    showToast(`${label} (Soon)`);
    setDialogue(`${label} is not available yet.`);
  }

  function runAction() {
    showToast("Can't run!");
    setDialogue("You can't run from a tournament match!");
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 text-white">
      {/* tiny CSS for idle float */}
      <style>{`
        @keyframes floaty { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
        .floaty { animation: floaty 2.2s ease-in-out infinite; }
      `}</style>

      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Battle Arena</h1>
          <p className="text-sm text-gray-300">
            Select your lineup, then battle turn-by-turn like a real Pokémon
            fight.
          </p>

          {state.phase === "battle_over" ? (
            <p className="mt-2 text-sm text-green-300">
              You earned{" "}
              <span className="font-semibold">+{state.lastEarned}</span> LEELAS
              (added to Pending).
            </p>
          ) : null}
        </div>

        <div className="flex gap-2">
          {state.phase !== "lineup" ? (
            <Button variant="outline" onClick={resetBattle}>
              Back to Lineup
            </Button>
          ) : null}

          {state.phase === "lineup" ? (
            <Button onClick={startBattle} disabled={!canStart}>
              Start Battle
            </Button>
          ) : null}
        </div>
      </div>

      {/* LINEUP SELECTION */}
      {state.phase === "lineup" ? (
        <Card className="rounded-3xl bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">
                Choose 3 Pokémon{" "}
                <span className="text-xs text-gray-400">
                  ({state.selectedIds.size}/3)
                </span>
              </div>
              <div className="text-xs text-gray-400">
                Click cards to select your lineup.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {ownedWithStableId.map((p) => {
                const selected = state.selectedIds.has(p._sid);
                const bp = toArenaPokemon(p, "PLAYER");
                return (
                  <button
                    key={p._sid}
                    onClick={() => toggleSelect(p._sid)}
                    className={[
                      "rounded-2xl border p-4 text-left transition",
                      selected
                        ? "border-yellow-400 bg-gray-900 ring-1 ring-yellow-400"
                        : "border-gray-800 bg-gray-950 hover:bg-gray-900",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 overflow-hidden rounded-xl bg-gray-800">
                        {bp.image ? (
                          <img
                            src={bp.image}
                            alt={bp.name}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {bp.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          Lv {bp.level} • {bp.rarity}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-300">
                      <div>HP: {bp.maxHp}</div>
                      <div>SPD: {bp.speed}</div>
                      <div>ATK: {bp.attack}</div>
                      <div>DEF: {bp.defense}</div>
                    </div>

                    <div className="mt-3 text-[11px] text-gray-400">
                      Moves:{" "}
                      <span className="text-gray-300">
                        {bp.skills.map((s) => s.name).join(", ")}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {ownedPokemons.length < 3 ? (
              <p className="mt-3 text-xs text-gray-400">
                You need at least 3 Pokémon to start.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* ARENA */}
      {state.phase !== "lineup" ? (
        <div className="w-full">
          <div className="relative overflow-hidden rounded-[28px] border border-white/10">
            {/* Stadium sky + ground + spotlight */}
            <div className="absolute inset-0 bg-linear-to-b from-[#0f2447] via-[#071022] to-[#03040a]" />
            <div className="absolute inset-x-0 bottom-0 h-[52%] bg-[radial-gradient(ellipse_at_center,rgba(60,180,120,0.22)_0%,rgba(10,30,20,0.05)_45%,rgba(0,0,0,0.65)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.10)_0%,rgba(0,0,0,0)_48%,rgba(0,0,0,0.70)_100%)]" />

            {/* subtle crowd lights */}
            <div
              className="absolute inset-0 opacity-[0.18]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Cdefs%3E%3CradialGradient id='g' cx='50%25' cy='50%25' r='60%25'%3E%3Cstop offset='0%25' stop-color='white' stop-opacity='0.75'/%3E%3Cstop offset='100%25' stop-color='white' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Ccircle cx='40' cy='30' r='18' fill='url(%23g)'/%3E%3Ccircle cx='110' cy='22' r='14' fill='url(%23g)'/%3E%3Ccircle cx='290' cy='34' r='18' fill='url(%23g)'/%3E%3Ccircle cx='250' cy='20' r='12' fill='url(%23g)'/%3E%3C/svg%3E\")",
                backgroundRepeat: "repeat",
                backgroundSize: "320px 180px",
              }}
            />

            <div className="relative p-4 sm:p-6 min-h-[640px]">
              {/* Match done indicator */}
              {state.toast ? (
                <div className="absolute left-1/2 top-6 -translate-x-1/2 z-20 pointer-events-none">
                  <div className="rounded-full border border-white/20 bg-black/65 px-5 py-2 text-sm font-extrabold tracking-wide shadow-[0_14px_40px_rgba(0,0,0,0.6)]">
                    {state.toast.text}
                  </div>
                </div>
              ) : null}

              {/* Enemy HUD */}
              <div className="absolute top-[22px] right-7 sm:right-[70px]">
                {activeAi ? (
                  <Hud
                    name={activeAi.name}
                    level={activeAi.level}
                    hp={activeAi.hp}
                    maxHp={activeAi.maxHp}
                    side="enemy"
                  />
                ) : null}
              </div>

              {/* Player HUD */}
              <div className="absolute bottom-[140px] left-7 sm:left-[70px]">
                {activePlayer ? (
                  <Hud
                    name={activePlayer.name}
                    level={activePlayer.level}
                    hp={activePlayer.hp}
                    maxHp={activePlayer.maxHp}
                    side="player"
                  />
                ) : null}
              </div>

              {/* Enemy platform + sprite */}
              <div className="absolute top-[132px] right-3.5 sm:right-11">
                <div className="relative">
                  <Platform size="sm" />
                  <div className="absolute left-1/2 top-[-66px] -translate-x-1/2">
                    <div className="h-[180px] w-[180px] sm:h-[210px] sm:w-[210px]">
                      {activeAi?.image ? (
                        <img
                          src={activeAi.image}
                          alt={activeAi.name}
                          className="h-full w-full object-contain drop-shadow-[0_22px_20px_rgba(0,0,0,0.65)] floaty"
                          draggable={false}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* Player platform + sprite */}
              <div className="absolute bottom-[270px] left-3.5 sm:left-11">
                <div className="relative">
                  <Platform size="md" />
                  <div className="absolute left-1/2 top-[-98px] -translate-x-1/2">
                    <div className="h-60 w-60 sm:h-[280px] sm:w-[280px]">
                      {activePlayer?.image ? (
                        <img
                          src={activePlayer.image}
                          alt={activePlayer.name}
                          className="h-full w-full object-contain drop-shadow-[0_26px_22px_rgba(0,0,0,0.7)] floaty"
                          draggable={false}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* Damage pop */}
              {state.lastDamage ? (
                <div className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="rounded-full bg-black/70 border border-white/15 px-4 py-2 text-sm shadow-[0_12px_30px_rgba(0,0,0,0.55)]">
                    <span className="font-extrabold text-yellow-300">
                      {state.lastDamage.amount}
                    </span>{" "}
                    DMG!
                  </div>
                </div>
              ) : null}

              {/* Floating dialogue (single only) */}
              <div className="absolute bottom-6 left-4 sm:left-6 max-w-[620px]">
                <BattleDialogue text={state.dialogue} />
              </div>

              {/* ✅ Option C Command Panel (compact, bottom-right) */}
              <div className="absolute bottom-6 right-4 sm:right-6">
                <div className="w-[340px] sm:w-[420px]">
                  <div className="rounded-[18px] border-4 border-neutral-200/70 bg-neutral-950/70 shadow-[0_14px_40px_rgba(0,0,0,0.55)]">
                    <div className="rounded-[12px] border border-white/10 bg-neutral-900/60 p-3 backdrop-blur">
                      {/* Header line */}
                      <div className="mb-2 flex items-center justify-between text-[11px] text-white/70">
                        <span>
                          Match {state.matchIndex + 1}/3 • You{" "}
                          {state.playerMatchWins} — {state.aiMatchWins} Enemy
                        </span>
                        {state.phase === "battle_over" ? (
                          <span className="text-emerald-300 font-semibold">
                            +{state.lastEarned} LEELAS
                          </span>
                        ) : (
                          <span
                            className={
                              state.turn === "player"
                                ? "text-emerald-300"
                                : "text-orange-300"
                            }
                          >
                            {state.turn === "player"
                              ? "Your turn"
                              : "Enemy turn"}
                          </span>
                        )}
                      </div>

                      {/* Root menu */}
                      {state.commandMode === "root" ? (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={openFight}
                            disabled={
                              isBattleLocked || state.phase !== "player_turn"
                            }
                            className={[
                              "rounded-[14px] border-2 px-4 py-4 text-left transition select-none",
                              isBattleLocked || state.phase !== "player_turn"
                                ? "border-white/10 bg-white/5 text-white/35"
                                : "border-white/20 bg-white/10 hover:bg-white/15 active:bg-white/20",
                            ].join(" ")}
                          >
                            <div className="text-lg font-extrabold tracking-wide">
                              FIGHT
                            </div>
                            <div className="mt-1 text-[11px] text-white/65">
                              Use a move
                            </div>
                          </button>

                          <button
                            onClick={() => comingSoon("BAG")}
                            disabled={isBattleLocked}
                            className={[
                              "rounded-[14px] border-2 px-4 py-4 text-left transition select-none",
                              isBattleLocked
                                ? "border-white/10 bg-white/5 text-white/35"
                                : "border-white/20 bg-white/10 hover:bg-white/15 active:bg-white/20",
                            ].join(" ")}
                          >
                            <div className="text-lg font-extrabold tracking-wide">
                              BAG
                            </div>
                            <div className="mt-1 text-[11px] text-white/65">
                              Items (soon)
                            </div>
                          </button>

                          <button
                            onClick={() => comingSoon("POKÉMON")}
                            disabled={isBattleLocked}
                            className={[
                              "rounded-[14px] border-2 px-4 py-4 text-left transition select-none",
                              isBattleLocked
                                ? "border-white/10 bg-white/5 text-white/35"
                                : "border-white/20 bg-white/10 hover:bg-white/15 active:bg-white/20",
                            ].join(" ")}
                          >
                            <div className="text-lg font-extrabold tracking-wide">
                              POKÉMON
                            </div>
                            <div className="mt-1 text-[11px] text-white/65">
                              Switch (soon)
                            </div>
                          </button>

                          <button
                            onClick={runAction}
                            disabled={isBattleLocked}
                            className={[
                              "rounded-[14px] border-2 px-4 py-4 text-left transition select-none",
                              isBattleLocked
                                ? "border-white/10 bg-white/5 text-white/35"
                                : "border-white/20 bg-white/10 hover:bg-white/15 active:bg-white/20",
                            ].join(" ")}
                          >
                            <div className="text-lg font-extrabold tracking-wide">
                              RUN
                            </div>
                            <div className="mt-1 text-[11px] text-white/65">
                              Not allowed
                            </div>
                          </button>
                        </div>
                      ) : null}

                      {/* Fight submenu */}
                      {state.commandMode === "fight" ? (
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <div className="text-sm font-extrabold tracking-wide text-white">
                              Choose a move
                            </div>
                            <button
                              onClick={backToRoot}
                              className="text-[11px] font-semibold text-white/70 hover:text-white transition"
                            >
                              ← Back
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {(activePlayer?.skills ?? [])
                              .slice(0, 4)
                              .map((sk) => {
                                const ppLeft = activePlayer?.pp?.[sk.id] ?? 0;
                                const disabled =
                                  state.phase !== "player_turn" ||
                                  !activePlayer ||
                                  activePlayer.hp <= 0 ||
                                  ppLeft <= 0 ||
                                  state.phase === "battle_over";

                                return (
                                  <button
                                    key={sk.id}
                                    onClick={() => playerUseSkill(sk)}
                                    disabled={disabled}
                                    className={[
                                      "relative rounded-[14px] px-4 py-3 text-left transition select-none border-2",
                                      disabled
                                        ? "border-white/10 bg-white/5 text-white/35"
                                        : "border-white/20 bg-white/10 hover:bg-white/15 active:bg-white/20",
                                    ].join(" ")}
                                    title={
                                      ppLeft <= 0
                                        ? "No PP left"
                                        : `${sk.type} • Power ${sk.power}`
                                    }
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="text-sm sm:text-base font-extrabold tracking-wide">
                                        {sk.name}
                                      </div>
                                      <div className="text-[11px] font-semibold text-white/70 tabular-nums">
                                        PP {ppLeft}/{sk.ppMax}
                                      </div>
                                    </div>

                                    <div className="mt-2 flex items-center gap-2">
                                      <span className="rounded-full border border-white/15 bg-black/30 px-2 py-0.5 text-[11px] font-semibold text-white/80">
                                        {sk.type}
                                      </span>
                                      <span className="text-[11px] text-white/65">
                                        Pow {sk.power}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* small top status */}
              <div className="absolute top-4 left-4 text-[11px] text-white/65">
                PvE • Turn-based • No MetaMask popups
              </div>
            </div>
          </div>

          {state.phase === "battle_over" ? (
            <div className="mt-4">
              <Button onClick={resetBattle} className="w-full">
                Battle Again
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default BattleArenaPage;
