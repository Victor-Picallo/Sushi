import { useState, type ChangeEvent, type FormEvent } from 'react';
import { createReview } from '../services/api';
import { compressImageToWebp } from '../utils/image';
import { ensurePlayerToken } from '../utils/session';

type QuickReviewModalProps = {
  restaurantId: number;
  restaurantName: string;
  userName: string;
  onClose: () => void;
};

export function QuickReviewModal({
  restaurantId,
  restaurantName,
  userName,
  onClose,
}: QuickReviewModalProps) {
  const [pieceName, setPieceName] = useState('');
  const [tasteScore, setTasteScore] = useState(5);
  const [sizeScore, setSizeScore] = useState(4);
  const [presentationScore, setPresentationScore] = useState(4);
  const [comment, setComment] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [photoInfo, setPhotoInfo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { dataUrl, blob } = await compressImageToWebp(file);
      setPhotoDataUrl(dataUrl);
      setPhotoInfo(`WebP (${Math.round(blob.size / 1024)} KB)`);
    } catch {
      setError('No se pudo procesar la foto.');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pieceName.trim()) {
      setError('Escribe el nombre de la pieza.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await createReview({
        playerToken: ensurePlayerToken(),
        authorName: userName.trim() || 'Anónimo',
        pieceName: pieceName.trim(),
        restaurantId,
        tasteScore,
        sizeScore,
        presentationScore,
        comment: comment.trim(),
        photoDataUrl,
      });
      setDone(true);
      window.setTimeout(onClose, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando valoración.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card privacy-modal-card">
        <h3>Valorar pieza en {restaurantName}</h3>
        {done ? (
          <p className="profile-saved-msg">✓ Valoración guardada en {restaurantName}</p>
        ) : (
          <form className="review-form" onSubmit={handleSubmit}>
            <input
              className="input"
              value={pieceName}
              onChange={(e) => setPieceName(e.target.value)}
              placeholder="Ej. Nigiri de salmón"
              required
            />
            <div className="rating-grid">
              <label className="rating-box">
                <span>Sabor ({tasteScore}/5)</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={tasteScore}
                  onChange={(e) => setTasteScore(Number(e.target.value))}
                />
              </label>
              <label className="rating-box">
                <span>Tamaño ({sizeScore}/5)</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={sizeScore}
                  onChange={(e) => setSizeScore(Number(e.target.value))}
                />
              </label>
              <label className="rating-box">
                <span>Aspecto ({presentationScore}/5)</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={presentationScore}
                  onChange={(e) => setPresentationScore(Number(e.target.value))}
                />
              </label>
            </div>
            <label className="photo-upload-box">
              <input type="file" accept="image/*" hidden onChange={handlePhotoChange} />
              <span className="photo-upload-icon">📷</span>
              <span className="photo-upload-text">
                {photoInfo ? `Foto lista: ${photoInfo}` : 'Añadir foto (opcional)'}
              </span>
            </label>
            <textarea
              className="input review-textarea"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Notas..."
            />
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="button button-primary full-width-btn" disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar valoración'}
            </button>
          </form>
        )}
        <button type="button" className="modal-close-button" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
