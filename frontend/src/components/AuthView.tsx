import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  isValidEmail,
  resendVerificationEmail,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  type AuthSession,
} from '../services/auth';
import { PrivacyModal } from './PrivacyModal';

type AuthViewProps = {
  onAuthenticated: (session: AuthSession) => void;
};

export function AuthView({ onAuthenticated }: AuthViewProps) {
  const { t, i18n } = useTranslation();
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setNeedsVerification(false);

    const cleanEmail = email.trim();
    if (!isValidEmail(cleanEmail)) {
      setError('Introduce un correo electrónico válido (ej. nombre@dominio.com).');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (isSignUpMode && !acceptedPrivacy) {
      setError('Debes aceptar la Política de Privacidad para crear tu cuenta.');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUpMode) {
        const result = await signUpWithEmail(
          displayName.trim() || cleanEmail.split('@')[0],
          cleanEmail,
          password,
        );
        if (result.needsEmailVerification) {
          setNeedsVerification(true);
          setInfoMsg('Cuenta creada. Revisa tu bandeja de entrada para validar tu correo antes de iniciar sesión.');
          setIsSignUpMode(false);
        } else if (result.session) {
          onAuthenticated(result.session);
        }
      } else {
        const session = await signInWithEmail(cleanEmail, password);
        onAuthenticated(session);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de autenticación.';
      if (msg === 'EMAIL_NOT_VERIFIED') {
        setNeedsVerification(true);
        setError('Tu correo aún no está verificado. Revisa tu email o reenvía el enlace.');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const cleanEmail = email.trim();
    if (!isValidEmail(cleanEmail)) {
      setError('Introduce un correo válido para reenviar la verificación.');
      return;
    }
    setError('');
    setInfoMsg('');
    try {
      await resendVerificationEmail(cleanEmail);
      setInfoMsg('Correo de verificación reenviado. Revisa tu bandeja de entrada (y spam).');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reenviar el correo.');
    }
  };

  return (
    <div className="app-shell landing-shell">
      <div className="app-card landing-card auth-gate-card">
        <div className="auth-lang-bar">
          <select
            className="input auth-lang-select"
            aria-label={t('profile.language')}
            value={i18n.resolvedLanguage || 'es'}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
          >
            <option value="es">🇪🇸 ES</option>
            <option value="en">🇬🇧 EN</option>
          </select>
        </div>

        <div className="app-header">
          <div className="logo-badge-container">
            <div className="sushi-circle-badge">
              <h1 className="app-title">SUSHI</h1>
              <img src="/favicon.svg" alt="Sushi Icon" className="app-favicon" />
              <div className="app-jp">寿司屋</div>
            </div>
          </div>
          <p className="app-subtitle">{t('landing.subtitle')}</p>
        </div>

        <div className="auth-mode-tabs">
          <button
            type="button"
            className={`auth-mode-tab ${!isSignUpMode ? 'active' : ''}`}
            onClick={() => {
              setIsSignUpMode(false);
              setError('');
              setInfoMsg('');
            }}
          >
            {t('profile.signIn')}
          </button>
          <button
            type="button"
            className={`auth-mode-tab ${isSignUpMode ? 'active' : ''}`}
            onClick={() => {
              setIsSignUpMode(true);
              setError('');
              setInfoMsg('');
            }}
          >
            {t('profile.signUp')}
          </button>
        </div>

        <form className="form-grid auth-form-spaced" onSubmit={handleSubmit} autoComplete="off" noValidate>
          {isSignUpMode && (
            <label className="field">
              <span>{t('profile.displayName')}</span>
              <input
                className="input"
                name="sushi_display_name"
                autoComplete="off"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej. Alberto"
              />
            </label>
          )}

          <label className="field">
            <span>{t('profile.email')}</span>
            <input
              type="email"
              name="sushi_email"
              autoComplete="off"
              className="input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
          </label>

          <label className="field">
            <span>{t('profile.password')}</span>
            <input
              type="password"
              name="sushi_password"
              autoComplete="new-password"
              className="input"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </label>

          {isSignUpMode && (
            <label className="privacy-checkbox-row">
              <input
                type="checkbox"
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              />
              <span>
                He leído y acepto la{' '}
                <button
                  type="button"
                  className="inline-link-btn"
                  onClick={() => setShowPrivacyModal(true)}
                >
                  Política de Privacidad
                </button>
              </span>
            </label>
          )}

          {error && <p className="form-error">{error}</p>}
          {infoMsg && <p className="profile-saved-msg">{infoMsg}</p>}

          {needsVerification && (
            <button
              type="button"
              className="button button-outline-clean full-width-btn"
              onClick={handleResendVerification}
            >
              Reenviar correo de verificación
            </button>
          )}

          <button type="submit" className="button button-primary full-width-btn" disabled={isLoading}>
            {isLoading
              ? t('reviews.saving')
              : isSignUpMode
                ? t('profile.signUp')
                : t('profile.signIn')}
          </button>

          <div className="auth-divider">
            <span>o</span>
          </div>

          <button
            type="button"
            className="google-btn full-width-btn"
            onClick={async () => {
              setError('');
              try {
                await signInWithGoogle();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Error iniciando con Google.');
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            <span>Continuar con Google</span>
          </button>

          <button
            type="button"
            className="inline-link-btn privacy-footer-link"
            onClick={() => setShowPrivacyModal(true)}
          >
            Política de Privacidad
          </button>
        </form>
      </div>

      {showPrivacyModal && <PrivacyModal onClose={() => setShowPrivacyModal(false)} />}
    </div>
  );
}
