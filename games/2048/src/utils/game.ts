export type Grid = number[][];
export type Direction = 'up' | 'down' | 'left' | 'right';

export function createEmptyGrid(): Grid {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}

export function addRandomTile(grid: Grid): Grid {
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = grid.map(row => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

export function initGrid(): Grid {
  return addRandomTile(addRandomTile(createEmptyGrid()));
}

function slideRow(row: number[]): { result: number[]; score: number } {
  const filtered = row.filter(v => v !== 0);
  const result: number[] = [];
  let score = 0;
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      result.push(merged);
      score += merged;
      i += 2;
    } else {
      result.push(filtered[i]);
      i++;
    }
  }
  while (result.length < 4) result.push(0);
  return { result, score };
}

function rotateGrid(grid: Grid): Grid {
  const n = grid.length;
  const rotated = createEmptyGrid();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      rotated[c][n - 1 - r] = grid[r][c];
    }
  }
  return rotated;
}

export function move(grid: Grid, direction: Direction): { grid: Grid; score: number; moved: boolean } {
  let g = grid.map(row => [...row]);
  let rotations = 0;

  switch (direction) {
    case 'left': rotations = 0; break;
    case 'down': rotations = 1; break;
    case 'right': rotations = 2; break;
    case 'up': rotations = 3; break;
  }

  for (let i = 0; i < rotations; i++) g = rotateGrid(g);

  let totalScore = 0;
  const newGrid = g.map(row => {
    const { result, score } = slideRow(row);
    totalScore += score;
    return result;
  });

  let result = newGrid;
  for (let i = 0; i < (4 - rotations) % 4; i++) result = rotateGrid(result);

  const moved = !gridsEqual(grid, result);
  return { grid: result, score: totalScore, moved };
}

function gridsEqual(a: Grid, b: Grid): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

export function canMove(grid: Grid): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) return true;
      if (c + 1 < 4 && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < 4 && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
}

export function hasWon(grid: Grid): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 2048) return true;
    }
  }
  return false;
}
