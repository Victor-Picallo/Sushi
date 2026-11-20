import type { RoomHistoryItem, RoomSummary } from '../types/sushi';

type LandingViewProps = {
  userName: string;
  roomId: string;
  message: string;
  roomHistory: RoomHistoryItem[];
  roomsSummaryMap: Record<string, RoomSummary>;
  onUserNameChange: (value: string) => void;
  onRoomIdChange: (value: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onRejoinFromHistory: (item: RoomHistoryItem) => void;
  onRemoveFromHistory: (roomId: string) => void;
};

export function LandingView({
  userName,
  roomId,
  message,
  roomHistory,
  roomsSummaryMap,
  onUserNameChange,
  onRoomIdChange,
  onCreateRoom,
  onJoinRoom,
  onRejoinFromHistory,
  onRemoveFromHistory,
}: LandingViewProps) {
  return (
    <div className="app-shell landing-shell">
      <div className="app-card landing-card">
        <div className="app-header">
          <div className="logo-badge-container">
            <div className="sushi-circle-badge">
              <h1 className="app-title">SUSHI</h1>
              <img src="/favicon.svg" alt="Sushi Icon" className="app-favicon" />
              <div className="app-jp">寿司屋</div>
            </div>
          </div>
          <p className="app-subtitle">
            Crea una sala nueva o únete a una existente para competir por el mejor score.
          </p>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Tu nombre</span>
            <input
              className="input"
              value={userName}
              onChange={(e) => onUserNameChange(e.target.value)}
              placeholder="Tu nombre"
            />
          </label>

          <label className="field">
            <span>ID de la sala</span>
            <input
              className="input"
              value={roomId}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              onChange={(e) => onRoomIdChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="ID de la sesión"
            />
          </label>

          <div className="button-row">
            <button type="button" className="button button-create" onClick={onCreateRoom}>
              Crear sala
            </button>
            <button type="button" className="button button-primary" onClick={onJoinRoom}>
              Entrar a la sala
            </button>
          </div>

          {message && <p className="form-error">{message}</p>}
        </div>

        {roomHistory.length > 0 && (
          <div className="recent-rooms-section">
            <h3 className="recent-rooms-title">Salas recientes 📜</h3>
            <div className="recent-rooms-list">
              {roomHistory.slice(0, 3).map((item) => {
                const summary = roomsSummaryMap[item.roomId];
                const isClosed = summary ? summary.isClosed : (item.isClosed ?? false);
                const players = summary?.players ?? item.finalPlayers ?? [];
                const playersCount = players.length;
                const playerNames = players.map((p) => p.name).join(', ');

                return (
                  <div key={item.roomId} className="recent-room-card">
                    <div className="recent-room-info">
                      <div className="recent-room-header">
                        <span className="recent-room-id">Sala #{item.roomId}</span>
                        <span className={`recent-status-pill ${isClosed ? 'closed' : 'active'}`}>
                          {isClosed ? '🔒 Cerrada' : '🟢 Activa'}
                        </span>
                      </div>
                      {playersCount > 0 ? (
                        <p className="recent-room-players">
                          <strong>
                            {playersCount} {playersCount === 1 ? 'jugador' : 'jugadores'}
                          </strong>
                          : {playerNames}
                        </p>
                      ) : (
                        <p className="recent-room-players muted">Toca 'Entrar' para unirte</p>
                      )}
                    </div>

                    <div className="recent-room-actions">
                      <button
                        type="button"
                        className="button button-rejoin"
                        onClick={() => onRejoinFromHistory(item)}
                      >
                        Entrar
                      </button>
                      <button
                        type="button"
                        className="remove-history-btn"
                        title="Quitar del historial"
                        onClick={() => onRemoveFromHistory(item.roomId)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
