import { useState } from 'react';
import { useGame } from './hooks/useGame';

export default function App() {
  const game = useGame();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [showRules, setShowRules] = useState(false);

  // ── Home Screen ──
  if (game.screen === 'home') {
    return (
      <div className="game-app">
        <div className="game-header">
          <a href="/" className="back-link">← Games</a>
          <h1>Tic Tac Toe</h1>
          <button className="rules-btn" onClick={() => setShowRules(true)}>?</button>
        </div>

        <div className="ttt-home">
          <input
            className="ttt-input"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={20}
          />
          <button
            className="btn btn-primary"
            disabled={name.trim().length < 3}
            onClick={() => game.createRoom(name.trim())}
          >
            Create Room
          </button>

          <div className="ttt-divider"><span>or</span></div>

          <input
            className="ttt-input"
            placeholder="Room code"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <button
            className="btn btn-secondary"
            disabled={name.trim().length < 3 || code.trim().length < 4}
            onClick={() => game.joinRoom(name.trim(), code.trim())}
          >
            Join Room
          </button>
        </div>

        {game.error && <p className="ttt-error">{game.error}</p>}
        {showRules && <Rules onClose={() => setShowRules(false)} />}
      </div>
    );
  }

  // ── Lobby Screen ──
  if (game.screen === 'lobby') {
    return (
      <div className="game-app">
        <div className="game-header">
          <a href="/" className="back-link">← Games</a>
          <h1>Tic Tac Toe</h1>
          <button className="rules-btn" onClick={() => setShowRules(true)}>?</button>
        </div>

        <div className="ttt-lobby">
          <div className="ttt-room-code">
            Room: <strong>{game.roomCode}</strong>
          </div>
          <p className="ttt-players-label">Players:</p>
          <ul className="ttt-player-list">
            {game.players.map(p => (
              <li key={p.id}>
                {p.name} {p.id === game.playerId ? '(You)' : ''}
              </li>
            ))}
          </ul>

          {game.players.length < 2 && (
            <p className="hint-text">Waiting for opponent to join…</p>
          )}

          {game.isHost && game.players.length >= 2 && (
            <button className="btn btn-primary" onClick={game.startGame}>
              Start Game
            </button>
          )}

          {!game.isHost && game.players.length >= 2 && (
            <p className="hint-text">Waiting for host to start…</p>
          )}
        </div>

        {game.error && <p className="ttt-error">{game.error}</p>}
        {showRules && <Rules onClose={() => setShowRules(false)} />}
      </div>
    );
  }

  // ── Playing / Game Over ──
  const opponent = game.players.find(p => p.id !== game.playerId);

  return (
    <div className="game-app">
      <div className="game-header">
        <a href="/" className="back-link">← Games</a>
        <h1>Tic Tac Toe</h1>
        <button className="rules-btn" onClick={() => setShowRules(true)}>?</button>
      </div>

      <div className="score-bar">
        <div className="score-box">
          <span className="label">You ({game.myMark})</span>
          <span className="value">{game.scores.find(s => s.id === game.playerId)?.score ?? 0}</span>
        </div>
        <div className="score-box">
          <span className="label">{opponent?.name ?? 'Opponent'}</span>
          <span className="value">{game.scores.find(s => s.id !== game.playerId)?.score ?? 0}</span>
        </div>
      </div>

      <p className="hint-text" style={{ marginBottom: '0.5rem' }}>
        {game.screen === 'game-over'
          ? game.isDraw ? "It's a draw!" : game.winnerId === game.playerId ? '🎉 You win!' : `${game.winnerName} wins!`
          : game.isMyTurn ? 'Your turn' : `${opponent?.name ?? 'Opponent'}'s turn`}
      </p>

      <div className="ttt-board">
        {game.board.map((cell, i) => (
          <button
            key={i}
            className={`ttt-cell ${cell === 'X' ? 'mark-x' : cell === 'O' ? 'mark-o' : ''}`}
            disabled={game.screen === 'game-over' || !game.isMyTurn || cell !== null}
            onClick={() => game.makeMove(i)}
          >
            {cell}
          </button>
        ))}
      </div>

      {game.screen === 'game-over' && (
        <div className="ttt-actions">
          <button className="btn btn-primary" onClick={game.rematch}>Rematch</button>
        </div>
      )}

      {game.error && <p className="ttt-error">{game.error}</p>}
      {showRules && <Rules onClose={() => setShowRules(false)} />}
    </div>
  );
}

function Rules({ onClose }: { onClose: () => void }) {
  return (
    <div className="rules-overlay" onClick={onClose}>
      <div className="rules-card" onClick={e => e.stopPropagation()}>
        <h2>How to Play Tic Tac Toe</h2>
        <h3>Goal</h3>
        <p>Get 3 of your marks (X or O) in a row — horizontally, vertically, or diagonally.</p>
        <h3>Rules</h3>
        <ul>
          <li>Create a room and share the code with a friend.</li>
          <li>Players take turns placing their mark on an empty cell.</li>
          <li>First to get 3 in a row wins the round.</li>
          <li>Marks swap after each round for fairness.</li>
        </ul>
        <div className="rules-close">
          <button className="btn btn-primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}
