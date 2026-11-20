import type { CelebrationState } from '../types/sushi';

type CelebrationOverlayProps = {
  celebration: CelebrationState;
  onClose: () => void;
};

export function CelebrationOverlay({ celebration, onClose }: CelebrationOverlayProps) {
  return (
    <div
      className="celebration-overlay"
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
        className="celebration-card"
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <div className="celebration-badge">{celebration.score} PIEZAS 🍣</div>
        <h2 className="celebration-title">{celebration.title}</h2>
        <div className="celebration-media">
          <img src={celebration.gifUrl} alt="Celebración Graciosa" className="celebration-gif" />
        </div>
        <p className="celebration-subtitle">{celebration.subtitle}</p>
        <button type="button" className="button button-primary celebration-button" onClick={onClose}>
          ¡Seguir comiendo! 🚀
        </button>
      </div>
    </div>
  );
}
