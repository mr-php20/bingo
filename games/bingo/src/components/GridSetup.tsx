import { useGame } from '../context/GameContext';
import { GRID_SIZE } from '../utils/bingo';

export default function GridSetup() {
  const { state, dispatch, submitGrid } = useGame();
  const { grid, placementStack, gridReady, readyCount, players } = state;

  const nextNumber = placementStack.length + 1;
  const allPlaced = placementStack.length === 25;

  const handleCellClick = (row: number, col: number) => {
    if (gridReady) return;

    // If this cell is the last placed number, undo it
    if (placementStack.length > 0) {
      const lastIdx = placementStack[placementStack.length - 1];
      const lastRow = Math.floor(lastIdx / GRID_SIZE);
      const lastCol = lastIdx % GRID_SIZE;
      if (row === lastRow && col === lastCol) {
        dispatch({ type: 'UNDO_LAST' });
        return;
      }
    }

    // Otherwise, place next number if cell is empty
    if (grid[row][col] === 0 && !allPlaced) {
      dispatch({ type: 'PLACE_NUMBER', row, col });
    }
  };

  const handleRandomFill = () => {
    if (gridReady) return;
    dispatch({ type: 'RANDOM_FILL' });
  };

  const handleUndo = () => {
    if (gridReady || placementStack.length === 0) return;
    dispatch({ type: 'UNDO_LAST' });
  };

  const handleReady = () => {
    if (!allPlaced || gridReady) return;
    submitGrid();
  };

  const isLastPlaced = (row: number, col: number) => {
    if (placementStack.length === 0) return false;
    const lastIdx = placementStack[placementStack.length - 1];
    return Math.floor(lastIdx / GRID_SIZE) === row && lastIdx % GRID_SIZE === col;
  };

  return (
    <div className="screen setup-screen">
      <h2>Place Your Numbers</h2>
      <p className="setup-hint">
        {gridReady
          ? readyCount + 1 >= players.length
            ? 'All ready! Starting...'
            : `Waiting for players... (${readyCount + 1}/${players.length} ready)`
          : allPlaced
            ? 'All numbers placed! Hit Ready.'
            : `Tap a cell to place ${nextNumber}`}
      </p>

      <div className="grid-container">
        {Array.from({ length: GRID_SIZE }, (_, r) => (
          <div key={r} className="grid-row">
            {Array.from({ length: GRID_SIZE }, (_, c) => {
              const val = grid[r][c];
              const last = isLastPlaced(r, c);
              return (
                <button
                  key={c}
                  className={`grid-cell setup-cell ${val ? 'filled' : 'empty'} ${last ? 'last-placed' : ''} ${gridReady ? 'locked' : ''}`}
                  onClick={() => handleCellClick(r, c)}
                  disabled={gridReady}
                >
                  {val || ''}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {!gridReady && (
        <div className="setup-actions">
          <button
            className="btn btn-secondary"
            onClick={handleUndo}
            disabled={placementStack.length === 0}
          >
            ↩ Undo
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleRandomFill}
            disabled={allPlaced}
          >
            🎲 Random Fill
          </button>
          <button
            className="btn btn-primary"
            onClick={handleReady}
            disabled={!allPlaced}
          >
            ✓ Ready
          </button>
        </div>
      )}

      {gridReady && (
        <div className="waiting-badge">
          ✓ Grid submitted {readyCount + 1 >= players.length ? '' : `— ${readyCount + 1}/${players.length} ready`}
        </div>
      )}

      <div className="next-number-indicator">
        {!gridReady && !allPlaced && (
          <span className="next-badge">Next: {nextNumber}</span>
        )}
      </div>
    </div>
  );
}
