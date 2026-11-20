import { useEffect, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchProfile, saveProfile } from '../services/api';
import {
  getStoredEmail,
  signOutFromNeon,
  type UserRole,
} from '../services/auth';
import { compressImageToWebp } from '../utils/image';
import { ensurePlayerToken } from '../utils/session';
import { CustomSelect } from './CustomSelect';
import { PrivacyModal } from './PrivacyModal';

type ProfileViewProps = {
  userName: string;
  role: UserRole;
  onUserNameChange: (name: string) => void;
  onRoleChange: (role: UserRole) => void;
  onSignedOut: () => void;
};

export function ProfileView({
  userName,
  role,
  onUserNameChange,
  onRoleChange,
  onSignedOut,
}: ProfileViewProps) {
  const { t, i18n } = useTranslation();
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [pendingAvatarDataUrl, setPendingAvatarDataUrl] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const authEmail = getStoredEmail();

  useEffect(() => {
    const token = ensurePlayerToken();
    fetchProfile(token)
      .then((profile) => {
        if (profile) {
          if (profile.displayName) {
            onUserNameChange(profile.displayName);
          }
          if (profile.avatarUrl) {
            setAvatarUrl(profile.avatarUrl);
          }
          if (profile.role === 'superuser' || profile.role === 'user') {
            onRoleChange(profile.role);
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
      setSavedMsg('Foto comprimida a WebP. Pulsa "Guardar perfil" para subirla.');
    } catch {
      setSavedMsg('No se pudo procesar el avatar.');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSavedMsg('');
    const cleanName = userName.trim() || 'Sushi Lover';
    onUserNameChange(cleanName);
    localStorage.setItem('userName', cleanName);
    try {
      const saved = await saveProfile(ensurePlayerToken(), {
        displayName: cleanName,
        avatarDataUrl: pendingAvatarDataUrl,
      });
      if (saved.avatarUrl) {
        setAvatarUrl(saved.avatarUrl);
      }
      setPendingAvatarDataUrl(undefined);
      setSavedMsg('Perfil actualizado en PostgreSQL.');
    } catch {
      setSavedMsg('Error conectando con el servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOutFromNeon();
    onSignedOut();
  };

  return (
    <div className="app-shell tab-shell">
      <div className="app-card tab-card profile-card-airy">
        <div className="tab-header">
          <div className="profile-header-row">
            <h2>{t('profile.title')}</h2>
            <span className={`role-badge ${role === 'superuser' ? 'super' : ''}`}>
              {role === 'superuser' ? '👑 Superuser' : '👤 User'}
            </span>
          </div>
          <p>{t('profile.subtitle')}</p>
        </div>

        <div className="profile-avatar-card">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="profile-avatar-img" />
          ) : (
            <div className="profile-avatar-placeholder">🍣</div>
          )}
          <div className="profile-avatar-meta">
            <strong>{userName || 'Sushi Lover'}</strong>
            <span className="muted small-text">{authEmail}</span>
            <label className="button button-outline-clean avatar-upload-btn">
              {t('profile.changePhoto')}
              <input type="file" accept="image/*" hidden onChange={handleAvatarChange} />
            </label>
          </div>
        </div>

        <div className="form-grid profile-form-spaced">
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
            <CustomSelect
              value={i18n.resolvedLanguage || 'es'}
              options={[
                { value: 'es', label: '🇪🇸 Español' },
                { value: 'en', label: '🇬🇧 English' },
              ]}
              onChange={(lang) => i18n.changeLanguage(lang)}
            />
          </label>

          <button
            type="button"
            className="button button-primary full-width-btn"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? t('reviews.saving') : t('profile.saveProfile')}
          </button>

          {savedMsg && <p className="profile-saved-msg">{savedMsg}</p>}
        </div>

        <div className="auth-box">
          <button
            type="button"
            className="button button-outline-clean full-width-btn"
            onClick={handleSignOut}
          >
            {t('profile.signOut')}
          </button>
          <button
            type="button"
            className="inline-link-btn privacy-footer-link"
            onClick={() => setShowPrivacyModal(true)}
          >
            Política de Privacidad
          </button>
        </div>
      </div>

      {showPrivacyModal && <PrivacyModal onClose={() => setShowPrivacyModal(false)} />}
    </div>
  );
}
