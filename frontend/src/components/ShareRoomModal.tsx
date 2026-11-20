import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

type ShareRoomModalProps = {
  roomId: string;
  restaurantName?: string | null;
  onClose: () => void;
};

export function ShareRoomModal({ roomId, restaurantName, onClose }: ShareRoomModalProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/?room=${roomId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card share-modal-card">
        <h3>Invitar a la Sala #{roomId}</h3>
        {restaurantName && <p className="muted">{restaurantName}</p>}
        <div className="qr-box">
          <QRCodeSVG value={shareUrl} size={172} />
        </div>
        <p className="small-text muted">Escanea este QR o comparte el enlace directo:</p>
        <button type="button" className="button button-primary full-width-btn" onClick={handleCopy}>
          {copied ? '✓ Enlace copiado' : 'Copiar enlace de invitación'}
        </button>
        <button type="button" className="modal-close-button" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
