import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';

export default function Home() {
  const { state, dispatch, createRoom, joinRoom } = useGame();
  const [mode, setMode] = useState<'menu' | 'join'>('menu');
  const [code, setCode] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setCode(roomParam.toUpperCase());
      setMode('join');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_PLAYER_NAME', name: e.target.value });
  };

  const handleCreate = () => {
    if (!state.playerName.trim()) return;
    createRoom();
  };

  const handleJoin = () => {
    if (!state.playerName.trim() || !code.trim()) return;
    joinRoom(code.trim());
  };

  return (
    <div className="screen home-screen">
      <div className="logo">
        <h1>BINGO</h1>
        <p className="subtitle">Indian Style</p>
      </div>

      {mode === 'menu' && (
        <div className="home-actions">
          <input
            type="text"
            className="input-name"
            placeholder="Enter your name"
            value={state.playerName}
            onChange={handleNameChange}
            maxLength={20}
            autoComplete="off"
          />
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={!state.playerName.trim()}
          >
            Create Game
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => { if (state.playerName.trim()) setMode('join'); }}
            disabled={!state.playerName.trim()}
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
            disabled={!code.trim() || code.trim().length < 6}
          >
            Join Room
          </button>
          <button className="btn btn-text" onClick={() => setMode('menu')}>
            Back
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
