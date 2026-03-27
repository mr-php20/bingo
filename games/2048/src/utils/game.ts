export type Grid = number[][];
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface TileData {
  id: number;
  value: number;
  row: number;
  col: number;
  prevRow: number;
  prevCol: number;
  isNew: boolean;
  isMerged: boolean;
}

let nextTileId = 1;

export function createEmptyGrid(): Grid {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}

export interface MoveResult {
  grid: Grid;
  tiles: TileData[];
  score: number;
  moved: boolean;
}

export function initGame(): { grid: Grid; tiles: TileData[] } {
  nextTileId = 1;
  const grid = createEmptyGrid();
  const tiles: TileData[] = [];
  addTile(grid, tiles);
  addTile(grid, tiles);
  return { grid, tiles };
}

function addTile(grid: Grid, tiles: TileData[]): void {
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  grid[r][c] = value;
  tiles.push({
    id: nextTileId++,
    value,
    row: r,
    col: c,
    prevRow: r,
    prevCol: c,
    isNew: true,
    isMerged: false,
  });
}

function slideLine(line: number[]): {
  line: number[];
  moves: { from: number; to: number; merged: boolean }[];
  score: number;
} {
  const moves: { from: number; to: number; merged: boolean }[] = [];
  const result = [0, 0, 0, 0];
  let score = 0;
  let writeIdx = 0;

  const nonZero: { val: number; idx: number }[] = [];
  for (let i = 0; i < 4; i++) {
    if (line[i] !== 0) nonZero.push({ val: line[i], idx: i });
  }

  let i = 0;
  while (i < nonZero.length) {
    if (i + 1 < nonZero.length && nonZero[i].val === nonZero[i + 1].val) {
      const merged = nonZero[i].val * 2;
      result[writeIdx] = merged;
      score += merged;
      moves.push({ from: nonZero[i].idx, to: writeIdx, merged: false });
      moves.push({ from: nonZero[i + 1].idx, to: writeIdx, merged: true });
      writeIdx++;
      i += 2;
    } else {
      result[writeIdx] = nonZero[i].val;
      moves.push({ from: nonZero[i].idx, to: writeIdx, merged: false });
      writeIdx++;
      i++;
    }
  }

  return { line: result, moves, score };
}

export function move(grid: Grid, tiles: TileData[], direction: Direction): MoveResult {
  const tileMap = new Map<string, TileData>();
  for (const t of tiles) {
    tileMap.set(`${t.row},${t.col}`, { ...t, isNew: false, isMerged: false, prevRow: t.row, prevCol: t.col });
  }

  const newGrid = createEmptyGrid();
  const newTiles: TileData[] = [];
  let totalScore = 0;
  let moved = false;

  for (let lineIdx = 0; lineIdx < 4; lineIdx++) {
    const line: number[] = [];
    const coords: [number, number][] = [];

    for (let pos = 0; pos < 4; pos++) {
      let r: number, c: number;
      switch (direction) {
        case 'left':  r = lineIdx; c = pos; break;
        case 'right': r = lineIdx; c = 3 - pos; break;
        case 'up':    r = pos; c = lineIdx; break;
        case 'down':  r = 3 - pos; c = lineIdx; break;
      }
      line.push(grid[r][c]);
      coords.push([r, c]);
    }

    const result = slideLine(line);
    totalScore += result.score;

    for (const m of result.moves) {
      const [fromR, fromC] = coords[m.from];
      const [toR, toC] = coords[m.to];
      const tile = tileMap.get(`${fromR},${fromC}`);
      if (!tile) continue;

      if (fromR !== toR || fromC !== toC) moved = true;

      if (m.merged) {
        // Second tile in a merge — find the winner tile already placed at destination
        const existing = newTiles.find(t => t.row === toR && t.col === toC);
        if (existing) {
          existing.value = result.line[m.to];
          existing.isMerged = true;
        }
      } else {
        newTiles.push({
          ...tile,
          row: toR,
          col: toC,
          prevRow: fromR,
          prevCol: fromC,
        });
      }
    }

    for (let pos = 0; pos < 4; pos++) {
      const [r, c] = coords[pos];
      newGrid[r][c] = result.line[pos];
    }
  }

  if (!moved) {
    return { grid, tiles: tiles.map(t => ({ ...t, isNew: false, isMerged: false })), score: 0, moved: false };
  }

  addTile(newGrid, newTiles);
  return { grid: newGrid, tiles: newTiles, score: totalScore, moved: true };
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
