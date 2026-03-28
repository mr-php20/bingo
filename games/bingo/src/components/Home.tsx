import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';

// Wake up the server on first visit so the cold start happens while the user is on the home screen
const serverUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';
fetch(`${serverUrl}/api/health`).catch(() => {});

export default function Home() {
  const { state, dispatch, createRoom, joinRoom } = useGame();
  const [mode, setMode] = useState<'menu' | 'join' | 'join-link'>('menu');
  const [code, setCode] = useState('');
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

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_PLAYER_NAME', name: e.target.value });
  };

  const nameTooShort = state.playerName.trim().length < 3;

  const handleCreate = () => {
    if (nameTooShort) return;
    createRoom();
  };

  const handleJoin = () => {
    if (nameTooShort || !code.trim()) return;
    joinRoom(code.trim());
  };

  return (
    <div className="screen home-screen">
      <a href="/" className="back-link">← Games</a>
      <div className="logo">
        <h1>BINGO</h1>
        <p className="subtitle">Indian Style</p>
      </div>
      <button className="rules-btn" style={{ margin: '0 auto 1rem' }} onClick={() => setShowRules(true)}>?</button>

      {mode === 'menu' && (
        <div className="home-actions">
          <input
            type="text"
            className="input-name"
            placeholder="Enter your name (min 3 chars)"
            value={state.playerName}
            onChange={handleNameChange}
            maxLength={20}
            autoComplete="off"
          />
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={nameTooShort}
          >
            Create Game
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => { if (!nameTooShort) setMode('join'); }}
            disabled={nameTooShort}
          >
            Join Game
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="home-actions">
          <p className="join-link-info">Joining as <strong>{state.playerName}</strong></p>
          <input
            type="text"
            className="input-code"
            placeholder="Enter room code"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            autoComplete="off"
            style={{ textTransform: 'uppercase', letterSpacing: '0.3em', textAlign: 'center' }}
          />
          <button
            className="btn btn-primary"
            onClick={handleJoin}
            disabled={!code.trim() || code.trim().length < 6 || nameTooShort}
          >
            Join Room
          </button>
          <button className="btn btn-text" onClick={() => setMode('menu')}>
            Back
          </button>
        </div>
      )}

      {mode === 'join-link' && (
        <div className="home-actions">
          <p className="join-link-info">Joining room <strong>{code}</strong></p>
          <input
            type="text"
            className="input-name"
            placeholder="Enter your name (min 3 chars)"
            value={state.playerName}
            onChange={handleNameChange}
            maxLength={20}
            autoComplete="off"
          />
          <button
            className="btn btn-primary"
            onClick={handleJoin}
            disabled={nameTooShort}
          >
            Join Game
          </button>
        </div>
      )}

      {state.error && (
        <div className="error-toast" onClick={() => dispatch({ type: 'CLEAR_ERROR' })}>
          {state.error}
        </div>
      )}

      {showRules && (
        <div className="rules-overlay" onClick={() => setShowRules(false)}>
          <div className="rules-card" onClick={e => e.stopPropagation()}>
            <h2>How to Play Bingo</h2>
            <h3>About</h3>
            <p>Indian-style Bingo for 2 players. Each player fills their own 5×5 grid with numbers 1–25, then takes turns calling numbers.</p>
            <h3>Setup</h3>
            <ul>
              <li>Create or join a room with a 6-character code.</li>
              <li>Fill your 5×5 board with numbers 1–25 in any order.</li>
            </ul>
            <h3>Gameplay</h3>
            <ul>
              <li>Players take turns calling a number (1–25).</li>
              <li>Both players mark the called number on their board.</li>
              <li>Complete a full <strong>row, column, or diagonal</strong> to score a letter: <strong>B‑I‑N‑G‑O</strong>.</li>
            </ul>
            <h3>Winning</h3>
            <p>First player to complete 5 lines and spell <strong>BINGO</strong> wins! Series mode lets you play best-of rounds.</p>
            <div className="rules-close">
              <button className="btn btn-primary" onClick={() => setShowRules(false)}>Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
