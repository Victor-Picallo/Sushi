import type { Room } from '../types/sushi';
import { getRankLabel } from '../utils/session';

type RoomViewProps = {
  roomId: string;
  roomData: Room | null;
  playerId: string | null;
  socketId: string | undefined;
  userName: string;
  movedPlayerIds: string[];
  floatingSushi: { id: number; x: number; y: number }[];
  onBack: () => void;
  onUpdateScore: (amount: number) => void;
  onFinishCount: () => void;
};

export function RoomView({
  roomId,
  roomData,
  playerId,
  socketId,
  userName,
  movedPlayerIds,
  floatingSushi,
  onBack,
  onUpdateScore,
  onFinishCount,
}: RoomViewProps) {
  const isRoomClosed = roomData?.isClosed;
  const totalRoomScore = roomData?.players.reduce((sum, player) => sum + player.score, 0) ?? 0;
  const currentUserNameKey = userName.trim().toLowerCase();

  return (
    <div className="app-shell">
      <div className="app-card room-card">
        <div className="room-top-bar">
          <div className="room-nav-group">
            <button type="button" className="back-link" onClick={onBack}>
              ← Atrás
            </button>
          </div>
          <div className={`status-chip ${isRoomClosed ? 'closed' : 'active'}`}>
            <span className="status-dot"></span>
            <span>{isRoomClosed ? '🔒 Recuento cerrado' : 'Partida en curso'}</span>
          </div>
        </div>

        <div className="room-header">
          <p className="room-label">Sala</p>
          <h2>{roomId}</h2>
        </div>

        <div className="room-total-counter-section">
          <div className="room-total-counter" aria-live="polite">
            <span className="room-total-label">Total sala</span>
            <strong>{totalRoomScore}</strong>
            <span className="room-total-unit">🍣</span>
          </div>
        </div>

        {!isRoomClosed && (
          <div className="global-score-buttons">
            <div className="global-buttons-wrap">
              <button
                type="button"
                className="button button-secondary small-button"
                onClick={() => onUpdateScore(-1)}
              >
                -
              </button>
              <button
                type="button"
                className="button button-secondary small-button"
                onClick={() => onUpdateScore(1)}
              >
                +
              </button>
            </div>
          </div>
        )}

        <section className="scoreboard">
          <div className="scoreboard-header">
            <div>
              <h3>Ranking 🏆</h3>
              <p>Actualiza tu propio score desde aquí.</p>
            </div>
          </div>

          {roomData?.players.length ? (
            <>
              {isRoomClosed && (
                <div className="room-message">Se ha cerrado el recuento de la partida.</div>
              )}
              <ul className="player-list">
                {roomData.players.map((player, index) => {
                  const isCurrentPlayer =
                    player.id === socketId ||
                    player.id === playerId ||
                    player.name.trim().toLowerCase() === currentUserNameKey;
                  return (
                    <li
                      key={player.id}
                      className={`player-row ${movedPlayerIds.includes(player.id) ? 'player-moved' : ''}`}
                    >
                      <div>
                        <span className="player-rank">{getRankLabel(index)}</span>
                        <span className="player-name">{player.name.toUpperCase()}</span>
                      </div>
                      <div className="player-actions">
                        <div className="score-badge-wrap">
                          <span className="player-score">{player.score} 🍣</span>
                          {isCurrentPlayer &&
                            floatingSushi.length > 0 &&
                            floatingSushi.map((item) => (
                              <span
                                key={item.id}
                                className="floating-sushi"
                                style={{ left: `${item.x}%`, top: `${item.y}%` }}
                                aria-hidden="true"
                              >
                                🍣
                              </span>
                            ))}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="empty-state">
              <p>Aún no hay jugadores en la sala.</p>
              <p>Comparte el ID con tus amigos para comenzar.</p>
            </div>
          )}
        </section>

        {!isRoomClosed && (
          <button
            type="button"
            className="button button-secondary finish-button"
            onClick={onFinishCount}
          >
            Terminar recuento
          </button>
        )}
      </div>
    </div>
  );
}
