export const GRID_SIZE = 5;
export const TOTAL_NUMBERS = 25;
export const LINES_TO_WIN = 5;
export const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'] as const;

/**
 * Count completed lines on a marked grid.
 */
export function countCompletedLines(marked: boolean[][]): number {
  let count = 0;

  // Rows
  for (let r = 0; r < GRID_SIZE; r++) {
    if (marked[r].every(v => v)) count++;
  }

  // Columns
  for (let c = 0; c < GRID_SIZE; c++) {
    let complete = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (!marked[r][c]) { complete = false; break; }
    }
    if (complete) count++;
  }

  // Main diagonal
  let diagComplete = true;
  for (let i = 0; i < GRID_SIZE; i++) {
    if (!marked[i][i]) { diagComplete = false; break; }
  }
  if (diagComplete) count++;

  // Anti-diagonal
  let antiDiagComplete = true;
  for (let i = 0; i < GRID_SIZE; i++) {
    if (!marked[i][GRID_SIZE - 1 - i]) { antiDiagComplete = false; break; }
  }
  if (antiDiagComplete) count++;

  return count;
}

/**
 * Create an empty 5x5 grid.
 */
export function createEmptyGrid(): number[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

/**
 * Create an empty 5x5 marked grid.
 */
export function createEmptyMarked(): boolean[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
}

/**
 * Generate a random grid with numbers 1–25.
 */
export function generateRandomGrid(): number[][] {
  const nums = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1);
  // Fisher-Yates shuffle
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  const grid: number[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    grid.push(nums.slice(r * GRID_SIZE, (r + 1) * GRID_SIZE));
  }
  return grid;
}

/**
 * Find the position of a number on a grid.
 */
export function findNumberPosition(grid: number[][], num: number): { row: number; col: number } | null {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === num) return { row: r, col: c };
    }
  }
  return null;
}

/**
 * Convert row,col to cell index (0-24).
 */
export function cellIndex(row: number, col: number): number {
  return row * GRID_SIZE + col;
}

/**
 * Convert cell index to row,col.
 */
export function indexToCell(index: number): { row: number; col: number } {
  return { row: Math.floor(index / GRID_SIZE), col: index % GRID_SIZE };
}

export type CompletedLine =
  | { type: 'row'; index: number }
  | { type: 'col'; index: number }
  | { type: 'diag'; index: 0 }
  | { type: 'anti-diag'; index: 0 };

/**
 * Get the list of completed lines with their type and index.
 */
export function getCompletedLines(marked: boolean[][]): CompletedLine[] {
  const lines: CompletedLine[] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    if (marked[r].every(v => v)) lines.push({ type: 'row', index: r });
  }

  for (let c = 0; c < GRID_SIZE; c++) {
    let complete = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (!marked[r][c]) { complete = false; break; }
    }
    if (complete) lines.push({ type: 'col', index: c });
  }

  let diagComplete = true;
  for (let i = 0; i < GRID_SIZE; i++) {
    if (!marked[i][i]) { diagComplete = false; break; }
  }
  if (diagComplete) lines.push({ type: 'diag', index: 0 });

  let antiDiagComplete = true;
  for (let i = 0; i < GRID_SIZE; i++) {
    if (!marked[i][GRID_SIZE - 1 - i]) { antiDiagComplete = false; break; }
  }
  if (antiDiagComplete) lines.push({ type: 'anti-diag', index: 0 });

  return lines;
}
