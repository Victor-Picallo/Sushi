type RoomCreatedModalProps = {
  roomId: string;
  onClose: () => void;
};

export function RoomCreatedModal({ roomId, onClose }: RoomCreatedModalProps) {
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
        className="modal-card"
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <h3>Sala creada</h3>
        <p>Tu ID de sala es:</p>
        <strong>{roomId}</strong>
        <p>Has entrado automáticamente a la sala.</p>
        <button type="button" className="modal-close-button" onClick={onClose}>
          Continuar
        </button>
      </div>
    </div>
  );
}
