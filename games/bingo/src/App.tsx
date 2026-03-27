import { useGame } from './context/GameContext';
import Home from './components/Home';
import Lobby from './components/Lobby';
import GridSetup from './components/GridSetup';
import GameBoard from './components/GameBoard';
import GameOver from './components/GameOver';

function AppContent() {
  const { state } = useGame();

  switch (state.screen) {
    case 'home':
      return <Home />;
    case 'lobby':
      return <Lobby />;
    case 'setup':
      return <GridSetup />;
    case 'playing':
      return <GameBoard />;
    case 'round-end':
    case 'series-end':
      return <GameOver />;
    default:
      return <Home />;
  }
}

export default function App() {
  return (
    <div className="app">
      <AppContent />
    </div>
  );
}
