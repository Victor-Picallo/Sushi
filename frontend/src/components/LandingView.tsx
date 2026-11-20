import { useTranslation } from 'react-i18next';
import type { RoomHistoryItem, RoomSummary } from '../types/sushi';
import { SushiLogoIcon, TrashIcon } from './Icons';

type LandingViewProps = {
  userName: string;
  roomId: string;
  message: string;
  roomHistory: RoomHistoryItem[];
  roomsSummaryMap: Record<string, RoomSummary>;
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
  onRoomIdChange,
  onCreateRoom,
  onJoinRoom,
  onRejoinFromHistory,
  onRemoveFromHistory,
}: LandingViewProps) {
  const { t } = useTranslation();

  return (
    <div className="app-shell landing-shell">
      <div className="app-card landing-card">
        <div className="app-header">
          <div className="logo-badge-container">
            <div className="sushi-circle-badge">
              <h1 className="app-title">SUSHI</h1>
              <SushiLogoIcon />
              <div className="app-jp">寿司屋</div>
            </div>
          </div>
          <div className="player-greeting-pill">
            🍣 <span>{userName || 'Sushi Lover'}</span>
          </div>
          <p className="app-subtitle">{t('landing.subtitle')}</p>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>{t('landing.roomId')}</span>
            <input
              className="input"
              value={roomId}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              onChange={(e) => onRoomIdChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder={t('landing.roomIdPlaceholder')}
            />
          </label>

          <div className="button-row clean-button-row">
            <button type="button" className="button button-create" onClick={onCreateRoom}>
              {t('landing.createRoom')}
            </button>
            <button type="button" className="button button-primary" onClick={onJoinRoom}>
              {t('landing.joinRoom')}
            </button>
          </div>

          {message && <p className="form-error">{message}</p>}
        </div>

        {roomHistory.length > 0 && (
          <div className="recent-rooms-section">
            <h3 className="recent-rooms-title">{t('landing.recentRooms')}</h3>
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
                          {isClosed ? t('landing.closed') : t('landing.active')}
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
                        <p className="recent-room-players muted">Toca '{t('landing.enter')}' para unirte</p>
                      )}
                    </div>

                    <div className="recent-room-actions">
                      <button
                        type="button"
                        className="button button-rejoin"
                        onClick={() => onRejoinFromHistory(item)}
                      >
                        {t('landing.enter')}
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
          </div>
        )}
      </div>
    </div>
  );
}
