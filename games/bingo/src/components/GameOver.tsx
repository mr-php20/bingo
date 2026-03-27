import { useGame } from '../context/GameContext';

const CONFETTI_COLORS = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd'];

function Confetti() {
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${2 + Math.random() * 2}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: `${6 + Math.random() * 8}px`,
  }));

  return (
    <div className="confetti-container" aria-hidden="true">
      {pieces.map((p, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
    </div>
  );
}

export default function GameOver() {
  const { state, nextRound, continueGame, rematch, goHome } = useGame();
  const { roundWinner, playerId, scores, currentRound, bestOf } = state;

  const iWon = roundWinner?.id === playerId;
  const isSeriesEnd = state.screen === 'series-end';
  const isSingleGame = bestOf === 1;

  // Find series winner
  const seriesWinner = isSeriesEnd
    ? scores.reduce((a, b) => (a.score > b.score ? a : b), scores[0])
    : null;
  const iWonSeries = seriesWinner?.id === playerId;

  const didWin = isSingleGame ? iWon : (isSeriesEnd ? iWonSeries : iWon);

  return (
    <div className="screen gameover-screen">
      {didWin && <Confetti />}
      {isSingleGame || isSeriesEnd ? (
        <>
          <h2 className={`result-title ${(isSingleGame ? iWon : iWonSeries) ? 'win' : 'lose'}`}>
            {(isSingleGame ? iWon : iWonSeries) ? '🏆 You Won!' : '😔 You Lost'}
          </h2>
          {!isSingleGame && <p className="round-detail">Best of {bestOf}</p>}
        </>
      ) : (
        <>
          <h2 className={`result-title ${iWon ? 'win' : 'lose'}`}>
            {iWon ? '🎉 You Won the Round!' : '😔 You Lost the Round'}
          </h2>
          <p className="round-detail">Round {currentRound} of {bestOf}</p>
        </>
      )}

      {!isSingleGame && (
        <div className="final-scores">
          {scores.map(s => (
            <div key={s.id} className={`score-card ${s.id === playerId ? 'me' : ''}`}>
              <span className="score-name">{s.id === playerId ? 'You' : s.name}</span>
              <span className="score-value">{s.score}</span>
            </div>
          ))}
        </div>
      )}

      <div className="gameover-actions">
        {!isSeriesEnd && !isSingleGame && (
          <button className="btn btn-primary" onClick={nextRound}>
            Next Round →
          </button>
        )}
        {(isSeriesEnd || isSingleGame) && (
          <>
            <button className="btn btn-primary" onClick={continueGame}>
              ▶ Continue Playing
            </button>
            <button className="btn btn-secondary" onClick={rematch}>
              🔄 Rematch (Reset Scores)
            </button>
          </>
        )}
        <button className="btn btn-text" onClick={goHome}>
          🏠 Back to Home
        </button>
      </div>
    </div>
  );
}
