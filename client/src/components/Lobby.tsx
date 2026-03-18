import { useGame } from '../context/GameContext';
import { useCallback } from 'react';

export default function Lobby() {
  const { state, setSeries, setHideOpponent, startGame, goHome } = useGame();
  const { roomCode, players, bestOf, isHost, hideOpponentStatus } = state;

  const handleShare = useCallback(async () => {
    const gameUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    const shareText = `Join my Bingo game!\n${gameUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Bingo Game', text: shareText, url: gameUrl });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(gameUrl);
    }
  }, [roomCode]);

  const handleCopy = useCallback(async () => {
    if (roomCode) {
      await navigator.clipboard.writeText(roomCode);
    }
  }, [roomCode]);

  const seriesOptions = [1, 3, 5, 7, 9];

  return (
    <div className="screen lobby-screen">
      <h2>Game Lobby</h2>

      <div className="room-code-section">
        <p className="label">Room Code</p>
        <div className="room-code" onClick={handleCopy} title="Click to copy">
          {roomCode}
        </div>
        <div className="room-code-actions">
          <button className="btn btn-small" onClick={handleCopy}>
            📋 Copy
          </button>
          <button className="btn btn-small" onClick={handleShare}>
            📤 Share
          </button>
        </div>
      </div>

      <div className="players-section">
        <p className="label">Players ({players.length})</p>
        {players.map(p => (
          <div key={p.id} className="player-tag">
            {p.name} {p.id === state.playerId ? '(You)' : ''}
          </div>
        ))}
        {players.length < 2 && (
          <div className="player-tag waiting">Waiting for players...</div>
        )}
      </div>

      {isHost && (
        <div className="series-section">
          <p className="label">Game Format</p>
          <select
            className="select-series"
            value={bestOf}
            onChange={e => setSeries(Number(e.target.value))}
          >
            {seriesOptions.map(n => (
              <option key={n} value={n}>
                {n === 1 ? 'Single Game' : `Best of ${n}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {!isHost && (
        <div className="series-section">
          <p className="label">{bestOf === 1 ? 'Single Game' : `Series: Best of ${bestOf}`}</p>
        </div>
      )}

      {isHost && (
        <div className="preference-section">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={hideOpponentStatus}
              onChange={e => setHideOpponent(e.target.checked)}
            />
            <span className="toggle-text">Hide opponent's progress</span>
          </label>
        </div>
      )}

      {!isHost && hideOpponentStatus && (
        <div className="preference-section">
          <p className="info-text">🙈 Opponent progress will be hidden</p>
        </div>
      )}

      {isHost && (
        <button
          className="btn btn-primary btn-start"
          onClick={startGame}
          disabled={players.length < 2}
        >
          {players.length < 2 ? 'Waiting for Player...' : 'Start Game'}
        </button>
      )}

      {!isHost && (
        <p className="info-text">Waiting for host to start the game...</p>
      )}

      <button className="btn btn-text" onClick={goHome}>
        Leave Room
      </button>
    </div>
  );
}
