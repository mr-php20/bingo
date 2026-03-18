import { useGame } from '../context/GameContext';
import { GRID_SIZE, BINGO_LETTERS, getCompletedLines } from '../utils/bingo';
import type { CompletedLine } from '../utils/bingo';

function isCellInCompletedLine(row: number, col: number, lines: CompletedLine[]): boolean {
  return lines.some(line => {
    if (line.type === 'row') return line.index === row;
    if (line.type === 'col') return line.index === col;
    if (line.type === 'diag') return row === col;
    if (line.type === 'anti-diag') return row + col === GRID_SIZE - 1;
    return false;
  });
}

export default function GameBoard() {
  const { state, callNumber } = useGame();
  const {
    grid, marked, playerId, currentTurn,
    calledNumbers, myCompletedLines, prevCompletedLineCount, playersCompletedLines,
    players, currentRound, bestOf, scores, hideOpponentStatus,
  } = state;

  const isMyTurn = currentTurn === playerId;
  const currentPlayer = players.find(p => p.id === currentTurn);
  const completedLines = getCompletedLines(marked);

  const handleCellClick = (row: number, col: number) => {
    if (!isMyTurn) return;
    const num = grid[row][col];
    if (num === 0 || calledNumbers.includes(num)) return;
    callNumber(num);
  };

  return (
    <div className="screen game-screen">
      <div className="game-header">
        {bestOf > 1 && (
          <div className="round-info">
            Round {currentRound} of {bestOf}
          </div>
        )}
        <div className={`turn-indicator ${isMyTurn ? 'my-turn' : 'opponent-turn'}`}>
          {isMyTurn ? '🟢 Your Turn' : `🔴 ${currentPlayer?.name ?? "..."}'s Turn`}
        </div>
      </div>

      <div className="bingo-progress">
        <div className="bingo-row">
          <span className="bingo-label">You: </span>
          {BINGO_LETTERS.map((letter, i) => (
            <span key={letter} className={`bingo-letter ${i < myCompletedLines ? 'lit' : ''}`}>
              {letter}
            </span>
          ))}
        </div>
        {!hideOpponentStatus && players.filter(p => p.id !== playerId).map(p => (
          <div key={p.id} className="bingo-row">
            <span className="bingo-label">{p.name}: </span>
            {BINGO_LETTERS.map((letter, i) => (
              <span key={letter} className={`bingo-letter opponent ${i < (playersCompletedLines[p.id] ?? 0) ? 'lit' : ''}`}>
                {letter}
              </span>
            ))}
          </div>
        ))}
      </div>

      {scores.length > 0 && bestOf > 1 && (
        <div className="mini-scoreboard">
          {scores.map(s => (
            <span key={s.id} className="mini-score">
              {s.id === playerId ? 'You' : s.name}: {s.score}
            </span>
          ))}
        </div>
      )}

      <div className="grid-container grid-with-lines">
        {Array.from({ length: GRID_SIZE }, (_, r) => (
          <div key={r} className="grid-row">
            {Array.from({ length: GRID_SIZE }, (_, c) => {
              const num = grid[r][c];
              const isMarked = marked[r][c];
              const canCall = isMyTurn && num > 0 && !calledNumbers.includes(num);
              const inLine = isCellInCompletedLine(r, c, completedLines);
              const isLastCalled = num > 0 && calledNumbers.length > 0 && calledNumbers[calledNumbers.length - 1] === num;
              return (
                <button
                  key={c}
                  className={`grid-cell game-cell ${isMarked ? 'marked' : ''} ${canCall ? 'callable' : ''} ${inLine ? 'in-completed-line' : ''} ${isLastCalled ? 'last-called' : ''}`}
                  onClick={() => handleCellClick(r, c)}
                  disabled={!canCall}
                >
                  <span className="cell-number">{num}</span>
                  {isMarked && <span className="cell-strike">✕</span>}
                </button>
              );
            })}
          </div>
        ))}
        {/* SVG overlay for line strikes */}
        <svg className="line-overlay" viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`} preserveAspectRatio="none">
          {completedLines.map((line, i) => {
            let x1: number, y1: number, x2: number, y2: number;
            if (line.type === 'row') {
              x1 = 0; y1 = line.index + 0.5; x2 = GRID_SIZE; y2 = line.index + 0.5;
            } else if (line.type === 'col') {
              x1 = line.index + 0.5; y1 = 0; x2 = line.index + 0.5; y2 = GRID_SIZE;
            } else if (line.type === 'diag') {
              x1 = 0; y1 = 0; x2 = GRID_SIZE; y2 = GRID_SIZE;
            } else {
              x1 = GRID_SIZE; y1 = 0; x2 = 0; y2 = GRID_SIZE;
            }
            const isNew = i >= prevCompletedLineCount;
            return (
              <line
                key={`${line.type}-${line.index}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                className={`strike-line ${isNew ? 'strike-new' : ''}`}
              />
            );
          })}
        </svg>
      </div>

      <div className="called-numbers">
        <p className="label">Called Numbers</p>
        <div className="called-list">
          {calledNumbers.length === 0 && <span className="no-calls">None yet</span>}
          {calledNumbers.map((n, i) => (
            <span key={i} className="called-num">{n}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
