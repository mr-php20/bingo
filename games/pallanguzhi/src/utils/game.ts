// Pallanguzhi — South Indian Mancala
// Board: 14 pits (indices 0-6 = Player 1's row, 7-13 = Player 2's row)
// Layout: Player 1 pits go left-to-right (0→6), Player 2 pits go right-to-left (13→7)
// Sowing is counter-clockwise. Captures happen when the last seed lands
// and the next pit has seeds, which are collected, continuing until next pit is empty.

export const PITS_PER_SIDE = 7;
export const TOTAL_PITS = 14;
export const SEEDS_PER_PIT = 6;
export const TOTAL_SEEDS = TOTAL_PITS * SEEDS_PER_PIT; // 84

export type Player = 0 | 1;

export interface GameState {
  pits: number[];          // 14 pits
  stores: [number, number]; // captured seeds for each player
  currentPlayer: Player;
  gameOver: boolean;
  winner: Player | null;   // null = tie
  lastSownPit: number | null;
}

export function createInitialState(): GameState {
  const pits = Array(TOTAL_PITS).fill(SEEDS_PER_PIT);
  return {
    pits,
    stores: [0, 0],
    currentPlayer: 0,
    gameOver: false,
    winner: null,
    lastSownPit: null,
  };
}

/** Returns which player owns pit index i */
export function pitOwner(i: number): Player {
  return i < PITS_PER_SIDE ? 0 : 1;
}

/** Returns the pits belonging to a player */
export function playerPits(player: Player): number[] {
  return player === 0
    ? [0, 1, 2, 3, 4, 5, 6]
    : [7, 8, 9, 10, 11, 12, 13];
}

/** Check if a player's side is completely empty */
function sideEmpty(pits: number[], player: Player): boolean {
  return playerPits(player).every(i => pits[i] === 0);
}

/** Next pit index in counter-clockwise direction */
function nextPit(i: number): number {
  return (i + 1) % TOTAL_PITS;
}

/** Can the current player pick from this pit? */
export function canPick(state: GameState, pitIndex: number): boolean {
  if (state.gameOver) return false;
  if (pitOwner(pitIndex) !== state.currentPlayer) return false;
  if (state.pits[pitIndex] === 0) return false;
  return true;
}

/**
 * Execute a move: pick seeds from pitIndex and sow them.
 * Returns the new state after the full turn (including captures).
 */
export function makeMove(state: GameState, pitIndex: number): GameState {
  if (!canPick(state, pitIndex)) return state;

  const pits = [...state.pits];
  const stores: [number, number] = [...state.stores];
  const player = state.currentPlayer;

  let hand = pits[pitIndex];
  pits[pitIndex] = 0;
  let pos = pitIndex;

  // Sow and capture loop
  while (hand > 0) {
    pos = nextPit(pos);
    pits[pos]++;
    hand--;

    if (hand === 0) {
      // Last seed dropped — check the next pit
      const next = nextPit(pos);

      if (pits[next] > 0) {
        // Pick up next pit's seeds and continue sowing
        hand = pits[next];
        pits[next] = 0;
        pos = next;
        // Continue the while loop — keep sowing
        // But first drop: we pick up from next and continue from there
        // pos is already set to next, so nextPit(pos) will continue
        // Actually, we just picked up from `next`, we continue sowing from `next`
        // so set pos = next - 1 effectively by continuing the loop directly
        // Let's just re-enter the loop: pos is at `next`, hand has seeds.
        // The loop will do pos = nextPit(pos) at top, which skips `next` (empty now).
        // We want to start dropping from the pit after `next`.
        // Current: pos = next (which is now empty), hand = what was in next.
        // Loop will: pos = nextPit(next), pits[pos]++, hand--. Correct!
      } else {
        // Next pit is empty — check the one after for capture
        const afterNext = nextPit(next);
        if (pits[afterNext] > 0) {
          // Capture the seeds in afterNext
          stores[player] += pits[afterNext];
          pits[afterNext] = 0;
        }
        // Turn ends
        break;
      }
    }
  }

  const lastSownPit = pos;

  // Check if game should end
  const nextPlayer: Player = player === 0 ? 1 : 0;
  let gameOver = false;
  let winner: Player | null = null;

  // If the next player's side is empty, current player captures remaining seeds on their side
  if (sideEmpty(pits, nextPlayer)) {
    for (const i of playerPits(player)) {
      stores[player] += pits[i];
      pits[i] = 0;
    }
    gameOver = true;
  }

  // Also check if current player's side is empty after the move
  if (!gameOver && sideEmpty(pits, player)) {
    for (const i of playerPits(nextPlayer)) {
      stores[nextPlayer] += pits[i];
      pits[i] = 0;
    }
    gameOver = true;
  }

  if (gameOver) {
    if (stores[0] > stores[1]) winner = 0;
    else if (stores[1] > stores[0]) winner = 1;
    else winner = null;
  }

  return {
    pits,
    stores,
    currentPlayer: gameOver ? player : nextPlayer,
    gameOver,
    winner,
    lastSownPit,
  };
}

/** Simple AI: pick the pit that maximizes captured seeds */
export function getAiMove(state: GameState): number {
  const myPits = playerPits(state.currentPlayer);
  const playable = myPits.filter(i => state.pits[i] > 0);
  if (playable.length === 0) return -1;

  let bestPit = playable[0];
  let bestScore = -1;

  for (const pit of playable) {
    const result = makeMove(state, pit);
    const score = result.stores[state.currentPlayer] - state.stores[state.currentPlayer];
    if (score > bestScore) {
      bestScore = score;
      bestPit = pit;
    }
  }

  return bestPit;
}
