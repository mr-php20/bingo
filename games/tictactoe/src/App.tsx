import { useState, useEffect, useCallback } from 'react';
import { useGame } from './hooks/useGame';
import { useLocalGame } from './hooks/useLocalGame';

export default function App() {
  const onlineGame = useGame();
  const localGame = useLocalGame();
  const [isLocal, setIsLocal] = useState(false);
  const game = isLocal ? localGame : onlineGame;
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'join' | 'join-link'>('menu');
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setCode(roomParam.toUpperCase());
      setMode('join-link');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const nameTooShort = name.trim().length < 3;

  const handleCreate = () => {
    if (nameTooShort) return;
    onlineGame.createRoom(name.trim());
  };

  const handleJoin = () => {
    if (nameTooShort || !code.trim()) return;
    onlineGame.joinRoom(name.trim(), code.trim());
  };

  const handlePassAndPlay = () => {
    setIsLocal(true);
    localGame.startLocal();
  };

  const handleCopy = useCallback(async () => {
    if (game.roomCode) await navigator.clipboard.writeText(game.roomCode);
  }, [game.roomCode]);

  const handleShare = useCallback(async () => {
    const gameUrl = `${window.location.origin}${window.location.pathname}?room=${game.roomCode}`;
    const shareText = `Join my Tic Tac Toe game!\n${gameUrl}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Tic Tac Toe', text: shareText, url: gameUrl }); } catch {}
    } else {
      await navigator.clipboard.writeText(gameUrl);
    }
  }, [game.roomCode]);

  // ── Home Screen ──
  if (game.screen === 'home') {
    return (
      <div className="game-app">
        <div className="game-header">
          <a href="/" className="back-link">← Games</a>
          <h1>Tic Tac Toe</h1>
          <button className="rules-btn" onClick={() => setShowRules(true)}>?</button>
        </div>

        {mode === 'menu' && (
          <div className="home-actions">
            <input
              type="text"
              placeholder="Enter your name (min 3 chars)"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
              autoComplete="off"
            />
            <button className="btn btn-primary" onClick={handleCreate} disabled={nameTooShort}>
              Create Game
            </button>
            <button className="btn btn-secondary" onClick={() => { if (!nameTooShort) setMode('join'); }} disabled={nameTooShort}>
              Join Game
            </button>
            <div className="divider"><span>or</span></div>
            <button className="btn btn-secondary" onClick={handlePassAndPlay}>Pass & Play</button>
          </div>
        )}

        {mode === 'join' && (
          <div className="home-actions">
            <p className="join-link-info">Joining as <strong>{name}</strong></p>
            <input
              type="text"
              placeholder="Enter room code"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              autoComplete="off"
              style={{ textTransform: 'uppercase', letterSpacing: '0.3em', textAlign: 'center' }}
            />
            <button className="btn btn-primary" onClick={handleJoin} disabled={!code.trim() || code.trim().length < 6 || nameTooShort}>
              Join Room
            </button>
            <button className="btn btn-text" onClick={() => setMode('menu')}>Back</button>
          </div>
        )}

        {mode === 'join-link' && (
          <div className="home-actions">
            <p className="join-link-info">Joining room <strong>{code}</strong></p>
            <input
              type="text"
              placeholder="Enter your name (min 3 chars)"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
              autoComplete="off"
            />
            <button className="btn btn-primary" onClick={handleJoin} disabled={nameTooShort}>
              Join Game
            </button>
          </div>
        )}

        {game.error && <div className="error-toast" onClick={game.clearError}>{game.error}</div>}
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

        <div className="lobby-section">
          <h2>Game Lobby</h2>

          <div className="room-code-section">
            <p className="label">Room Code</p>
            <div className="room-code" onClick={handleCopy} title="Click to copy">
              {game.roomCode}
            </div>
            <div className="room-code-actions">
              <button className="btn btn-small" onClick={handleCopy}>📋 Copy</button>
              <button className="btn btn-small" onClick={handleShare}>📤 Share</button>
            </div>
          </div>

          <div className="players-section">
            <p className="label">Players ({game.players.length})</p>
            {game.players.map(p => (
              <div key={p.id} className="player-tag">
                {p.name} {p.id === game.playerId ? '(You)' : ''}
              </div>
            ))}
            {game.players.length < 2 && (
              <div className="player-tag waiting">Waiting for opponent…</div>
            )}
          </div>

          {game.isHost && (
            <button className="btn btn-primary" onClick={game.startGame} disabled={game.players.length < 2}>
              {game.players.length < 2 ? 'Waiting for Player…' : 'Start Game'}
            </button>
          )}

          {!game.isHost && (
            <p className="info-text">Waiting for host to start the game…</p>
          )}

          <button className="btn btn-text" onClick={game.goHome}>Leave Room</button>
        </div>

        {game.error && <div className="error-toast" onClick={game.clearError}>{game.error}</div>}
        {showRules && <Rules onClose={() => setShowRules(false)} />}
      </div>
    );
  }

  // ── Playing / Game Over ──
  const opponent = isLocal
    ? game.players.find(p => p.id !== game.playerId)
    : game.players.find(p => p.id !== game.playerId);

  return (
    <div className="game-app">
      <div className="game-header">
        <a href="/" className="back-link">← Games</a>
        <h1>Tic Tac Toe</h1>
        <button className="rules-btn" onClick={() => setShowRules(true)}>?</button>
      </div>

      <div className="score-bar">
        <div className={`score-box ${isLocal && (game as any).currentMark === 'X' && game.screen === 'playing' ? 'active-turn' : ''}`}>
          <span className="label">{isLocal ? 'Player X' : `You (${game.myMark})`}</span>
          <span className="value">{game.scores.find(s => s.id === (isLocal ? 'x' : game.playerId))?.score ?? 0}</span>
        </div>
        <div className={`score-box ${isLocal && (game as any).currentMark === 'O' && game.screen === 'playing' ? 'active-turn' : ''}`}>
          <span className="label">{isLocal ? 'Player O' : (opponent?.name ?? 'Opponent')}</span>
          <span className="value">{game.scores.find(s => s.id === (isLocal ? 'o' : opponent?.id))?.score ?? 0}</span>
        </div>
      </div>

      <p className="hint-text" style={{ marginBottom: '0.5rem' }}>
        {game.screen === 'game-over'
          ? game.isDraw ? "It's a draw!" : isLocal ? `🎉 ${game.winnerName} wins!` : game.winnerId === game.playerId ? '🎉 You win!' : `${game.winnerName} wins!`
          : isLocal ? `${(game as any).currentMark === 'X' ? 'Player X' : 'Player O'}'s turn` : game.isMyTurn ? 'Your turn' : `${opponent?.name ?? 'Opponent'}'s turn`}
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
        <div className="game-actions">
          <button className="btn btn-primary" onClick={game.rematch}>Rematch</button>
          {isLocal && <button className="btn btn-text" onClick={() => { localGame.goHome(); setIsLocal(false); }}>Back to Menu</button>}
        </div>
      )}

      {game.error && <div className="error-toast" onClick={game.clearError}>{game.error}</div>}
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
