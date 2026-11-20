import type { Room } from '../types/sushi';

type PodiumModalProps = {
  roomData: Room;
  onClose: () => void;
};

export function PodiumModal({ roomData, onClose }: PodiumModalProps) {
  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div
        className="podium-card"
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <h3>Podium final</h3>
        <p>Resultados de la partida</p>
        <ol className="podium-list">
          {roomData.players.slice(0, 3).map((player, index) => (
            <li key={player.id} className={`podium-position position-${index + 1}`}>
              <span className="podium-rank">
                {index === 0 ? '🏆' : index === 1 ? '🥈' : '🥉'}
              </span>
              <span className="podium-name">{player.name.toUpperCase()}</span>
              <span className="podium-score">{player.score} 🍣</span>
            </li>
          ))}
        </ol>
        <button type="button" className="modal-close-button" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
