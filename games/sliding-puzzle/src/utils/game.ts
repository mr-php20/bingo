export type Board = (number | null)[];

export function createSolvedBoard(): Board {
  const board: Board = [];
  for (let i = 1; i <= 15; i++) board.push(i);
  board.push(null);
  return board;
}

function countInversions(board: Board): number {
  let inversions = 0;
  const nums = board.filter((v): v is number => v !== null);
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] > nums[j]) inversions++;
    }
  }
  return inversions;
}

function getBlankRow(board: Board): number {
  const blankIndex = board.indexOf(null);
  return Math.floor(blankIndex / 4);
}

function isSolvable(board: Board): boolean {
  const inversions = countInversions(board);
  const blankRow = getBlankRow(board);
  // For a 4x4 grid: solvable when blank on even row from bottom and inversions is odd,
  // or blank on odd row from bottom and inversions is even
  const blankFromBottom = 3 - blankRow;
  if (blankFromBottom % 2 === 0) return inversions % 2 === 1;
  return inversions % 2 === 0;
}

export function shuffleBoard(): Board {
  let board: Board;
  do {
    const nums: Board = [];
    for (let i = 1; i <= 15; i++) nums.push(i);
    // Fisher-Yates
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    nums.push(null);
    board = nums;
  } while (!isSolvable(board) || isSolved(board));
  return board;
}

export function canMoveTile(board: Board, index: number): boolean {
  const blankIndex = board.indexOf(null);
  const row = Math.floor(index / 4);
  const col = index % 4;
  const blankRow = Math.floor(blankIndex / 4);
  const blankCol = blankIndex % 4;
  return (Math.abs(row - blankRow) + Math.abs(col - blankCol)) === 1;
}

export function moveTile(board: Board, index: number): Board {
  if (!canMoveTile(board, index)) return board;
  const newBoard = [...board];
  const blankIndex = board.indexOf(null);
  newBoard[blankIndex] = newBoard[index];
  newBoard[index] = null;
  return newBoard;
}

export function isSolved(board: Board): boolean {
  for (let i = 0; i < 15; i++) {
    if (board[i] !== i + 1) return false;
  }
  return board[15] === null;
}
