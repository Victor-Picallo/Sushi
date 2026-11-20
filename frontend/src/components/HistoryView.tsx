import type { RoomHistoryItem, RoomSummary } from '../types/sushi';
import { TrashIcon } from './Icons';

type HistoryViewProps = {
  roomHistory: RoomHistoryItem[];
  roomsSummaryMap: Record<string, RoomSummary>;
  onRejoinFromHistory: (item: RoomHistoryItem) => void;
  onRemoveFromHistory: (roomId: string) => void;
};

export function HistoryView({
  roomHistory,
  roomsSummaryMap,
  onRejoinFromHistory,
  onRemoveFromHistory,
}: HistoryViewProps) {
  return (
    <div className="app-shell tab-shell">
      <div className="app-card tab-card">
        <div className="tab-header">
          <h2>Historial de Salas 📜</h2>
          <p>Tus cenas y recuentos sincronizados con PostgreSQL.</p>
        </div>

        {roomHistory.length === 0 ? (
          <div className="tab-empty-card">
            <span className="tab-empty-emoji">🥢</span>
            <p>Todavía no has entrado a ninguna sala.</p>
            <p className="muted">Crea o únete a una sala desde la pestaña Sala para verla aquí.</p>
          </div>
        ) : (
          <div className="recent-rooms-list">
            {roomHistory.map((item) => {
              const summary = roomsSummaryMap[item.roomId];
              const isClosed = summary ? summary.isClosed : (item.isClosed ?? false);
              const players = summary?.players ?? item.finalPlayers ?? [];
              const totalPieces = players.reduce((acc, p) => acc + p.score, 0);
              const formattedDate = new Date(item.lastJoinedAt).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={item.roomId} className="recent-room-card history-detail-card">
                  <div className="recent-room-info">
                    <div className="recent-room-header">
                      <span className="recent-room-id">Sala #{item.roomId}</span>
                      <span className={`recent-status-pill ${isClosed ? 'closed' : 'active'}`}>
                        {isClosed ? '🔒 Cerrada' : '🟢 Activa'}
                      </span>
                    </div>
                    <p className="history-meta">
                      {formattedDate} · Como <strong>{item.userName}</strong>
                      {totalPieces > 0 ? ` · Total: ${totalPieces} 🍣` : ''}
                    </p>
                    {players.length > 0 && (
                      <p className="recent-room-players">
                        {players
                          .slice()
                          .sort((a, b) => b.score - a.score)
                          .map((p) => `${p.name} (${p.score})`)
                          .join(' · ')}
                      </p>
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
                      title="Borrar sala del historial"
                      onClick={() => onRemoveFromHistory(item.roomId)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
