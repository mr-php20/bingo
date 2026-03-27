import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';

// Wake up the server on first visit so the cold start happens while the user is on the home screen
const serverUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';
fetch(`${serverUrl}/api/health`).catch(() => {});

export default function Home() {
  const { state, dispatch, createRoom, joinRoom } = useGame();
  const [mode, setMode] = useState<'menu' | 'join' | 'join-link'>('menu');
  const [code, setCode] = useState('');

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
    </div>
  );
}
