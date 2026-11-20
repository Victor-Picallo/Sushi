import { useTranslation } from 'react-i18next';

type PrivacyModalProps = {
  onClose: () => void;
};

export function PrivacyModal({ onClose }: PrivacyModalProps) {
  const { i18n } = useTranslation();
  const isEnglish = (i18n.resolvedLanguage || 'es').startsWith('en');

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card privacy-modal-card">
        <h3>{isEnglish ? 'Privacy Policy (GDPR)' : 'Política de Privacidad (RGPD)'}</h3>

        {isEnglish ? (
          <div className="privacy-body">
            <p>
              <strong>1. Data we collect:</strong> Email address (for account authentication and
              verification), display name, optional profile avatar, room participation history, and
              sushi/restaurant reviews (including optional compressed photos).
            </p>
            <p>
              <strong>2. Purpose:</strong> Exclusively to run the FatSushi app (real-time room
              counters, history, user profiles and piece ratings). We do not sell or share your
              data for advertising.
            </p>
            <p>
              <strong>3. Infrastructure & Storage:</strong> Authentication, PostgreSQL database and
              image buckets are hosted on <strong>Neon (AWS Europe Central — Frankfurt)</strong>,
              the frontend on <strong>Vercel</strong> and the backend on <strong>Render</strong>.
            </p>
            <p>
              <strong>4. Local Storage:</strong> We only use strictly necessary technical{' '}
              <code>localStorage</code> keys (session token, language preference and room ID). No
              tracking or ad cookies are used.
            </p>
            <p>
              <strong>5. Your Rights:</strong> You may request access, correction or full deletion
              of your account and associated data at any time by contacting the app administrator.
            </p>
          </div>
        ) : (
          <div className="privacy-body">
            <p>
              <strong>1. Datos que recopilamos:</strong> Correo electrónico (para autenticación y
              verificación de cuenta), nombre visible, avatar opcional, historial de salas y
              valoraciones de piezas/restaurantes (incluyendo fotos opcionales comprimidas).
            </p>
            <p>
              <strong>2. Finalidad:</strong> Exclusivamente para el funcionamiento de FatSushi
              (salas en tiempo real, historial, perfiles y reseñas). No vendemos ni cedemos tus
              datos con fines publicitarios.
            </p>
            <p>
              <strong>3. Alojamiento:</strong> La autenticación, base de datos PostgreSQL y bucket
              de imágenes se alojan en <strong>Neon (AWS Europa Central — Frankfurt)</strong>, el
              frontend en <strong>Vercel</strong> y el backend en <strong>Render</strong>.
            </p>
            <p>
              <strong>4. Almacenamiento local:</strong> Solo usamos <code>localStorage</code>{' '}
              técnico estrictamente necesario (sesión, idioma y sala activa). No utilizamos cookies
              de seguimiento ni publicidad.
            </p>
            <p>
              <strong>5. Tus derechos (RGPD):</strong> Puedes solicitar el acceso, rectificación o
              eliminación completa de tu cuenta y datos en cualquier momento contactando con el
              administrador de la aplicación.
            </p>
          </div>
        )}

        <button type="button" className="modal-close-button" onClick={onClose}>
          {isEnglish ? 'Close' : 'Cerrar'}
        </button>
      </div>
    </div>
  );
}
