import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchProfile, saveProfile } from '../services/api';
import {
  clearAuthSession,
  getStoredAuthToken,
  getStoredEmail,
  getStoredRole,
  signInWithEmail,
  signUpWithEmail,
  type UserRole,
} from '../services/auth';
import { compressImageToWebp } from '../utils/image';
import { ensurePlayerToken } from '../utils/session';

type ProfileViewProps = {
  userName: string;
  onUserNameChange: (name: string) => void;
};

const AVATAR_KEY = 'sushi_avatar_preview';

export function ProfileView({ userName, onUserNameChange }: ProfileViewProps) {
  const { t, i18n } = useTranslation();
  const [avatarUrl, setAvatarUrl] = useState<string>(() => localStorage.getItem(AVATAR_KEY) || '');
  const [pendingAvatarDataUrl, setPendingAvatarDataUrl] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const [authToken, setAuthToken] = useState<string>(() => getStoredAuthToken());
  const [authEmail, setAuthEmail] = useState<string>(() => getStoredEmail());
  const [role, setRole] = useState<UserRole>(() => getStoredRole());
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authMsg, setAuthMsg] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const token = ensurePlayerToken();
    fetchProfile(token)
      .then((profile) => {
        if (profile) {
          if (profile.displayName && !userName) {
            onUserNameChange(profile.displayName);
          }
          if (profile.avatarUrl) {
            setAvatarUrl(profile.avatarUrl);
            localStorage.setItem(AVATAR_KEY, profile.avatarUrl);
          }
          if (profile.role === 'superuser' || profile.role === 'user') {
            setRole(profile.role);
            localStorage.setItem('sushi_user_role', profile.role);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { dataUrl } = await compressImageToWebp(file, 512, 0.85);
      setAvatarUrl(dataUrl);
      setPendingAvatarDataUrl(dataUrl);
      localStorage.setItem(AVATAR_KEY, dataUrl);
      setSavedMsg('Foto comprimida a WebP. Pulsa "Guardar perfil" para subirla.');
    } catch {
      setSavedMsg('No se pudo procesar el avatar.');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSavedMsg('');
    localStorage.setItem('userName', userName);
    try {
      const saved = await saveProfile(ensurePlayerToken(), {
        displayName: userName.trim() || 'Sushi Lover',
        avatarDataUrl: pendingAvatarDataUrl,
      });
      if (saved.avatarUrl) {
        setAvatarUrl(saved.avatarUrl);
        localStorage.setItem(AVATAR_KEY, saved.avatarUrl);
      }
      setPendingAvatarDataUrl(undefined);
      setSavedMsg('Perfil guardado en PostgreSQL.');
    } catch {
      setSavedMsg('Guardado en local (error conectando con el servidor).');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthMsg('');
    try {
      const session = isSignUpMode
        ? await signUpWithEmail(userName.trim() || emailInput.split('@')[0], emailInput, passwordInput)
        : await signInWithEmail(emailInput, passwordInput);
      setAuthToken(session.token);
      setAuthEmail(session.email);
      setRole(session.role);
      setPasswordInput('');
      setAuthMsg('Sesión iniciada correctamente.');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Error de autenticación.');
    }
  };

  const handleSignOut = () => {
    clearAuthSession();
    setAuthToken('');
    setAuthEmail('');
    setRole('user');
    setAuthMsg('Sesión cerrada.');
  };

  return (
    <div className="app-shell tab-shell">
      <div className="app-card tab-card">
        <div className="tab-header">
          <div className="profile-header-row">
            <h2>{t('profile.title')}</h2>
            <span className={`role-badge ${role === 'superuser' ? 'super' : ''}`}>
              {role === 'superuser' ? '👑 Superuser' : '👤 User'}
            </span>
          </div>
          <p>{t('profile.subtitle')}</p>
        </div>

        <div className="profile-avatar-section">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="profile-avatar-img" />
          ) : (
            <div className="profile-avatar-placeholder">🍣</div>
          )}
          <label className="button button-secondary avatar-upload-btn">
            {t('profile.changePhoto')}
            <input type="file" accept="image/*" hidden onChange={handleAvatarChange} />
          </label>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>{t('profile.displayName')}</span>
            <input
              className="input"
              value={userName}
              onChange={(e) => onUserNameChange(e.target.value)}
              placeholder={t('profile.displayName')}
            />
          </label>

          <label className="field">
            <span>{t('profile.language')}</span>
            <select
              className="input"
              value={i18n.resolvedLanguage || 'es'}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
            >
              <option value="es">🇪🇸 Español</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </label>

          <button
            type="button"
            className="button button-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? t('reviews.saving') : t('profile.saveProfile')}
          </button>

          {savedMsg && <p className="profile-saved-msg">{savedMsg}</p>}
        </div>

        <div className="auth-box">
          <h3>{t('profile.authTitle')}</h3>
          {authToken ? (
            <div className="auth-logged-in">
              <p>
                Conectado como <strong>{authEmail || 'Usuario'}</strong> ({role})
              </p>
              <button type="button" className="button button-secondary" onClick={handleSignOut}>
                {t('profile.signOut')}
              </button>
            </div>
          ) : (
            <form className="form-grid" onSubmit={handleAuthSubmit}>
              <label className="field">
                <span>{t('profile.email')}</span>
                <input
                  type="email"
                  className="input"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="tu@email.com"
                />
              </label>
              <label className="field">
                <span>{t('profile.password')}</span>
                <input
                  type="password"
                  className="input"
                  required
                  minLength={8}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                />
              </label>
              <div className="button-row">
                <button type="submit" className="button button-primary">
                  {isSignUpMode ? t('profile.signUp') : t('profile.signIn')}
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsSignUpMode((prev) => !prev)}
                >
                  {isSignUpMode ? t('profile.signIn') : t('profile.signUp')}
                </button>
              </div>
              {authError && <p className="form-error">{authError}</p>}
              {authMsg && <p className="profile-saved-msg">{authMsg}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
