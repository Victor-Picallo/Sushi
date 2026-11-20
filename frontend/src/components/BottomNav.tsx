import { useTranslation } from 'react-i18next';
import type { AppTab } from '../types/sushi';

type BottomNavProps = {
  activeTab: AppTab;
  inRoom: boolean;
  isSuperuser: boolean;
  onSelectTab: (tab: AppTab) => void;
};

export function BottomNav({ activeTab, inRoom, isSuperuser, onSelectTab }: BottomNavProps) {
  const { t } = useTranslation();

  const navItems: { id: AppTab; icon: string; label: string }[] = [
    { id: 'room', icon: '🍣', label: inRoom ? t('nav.inRoom') : t('nav.room') },
    { id: 'history', icon: '📜', label: t('nav.history') },
    { id: 'reviews', icon: '⭐', label: t('nav.reviews') },
    ...(isSuperuser ? [{ id: 'admin' as AppTab, icon: '⚙️', label: 'Config' }] : []),
    { id: 'profile', icon: '👤', label: t('nav.profile') },
  ];

  return (
    <nav
      className="mobile-bottom-nav"
      style={{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }}
      aria-label="Navegación principal"
    >
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onSelectTab(item.id)}
          >
            <span className="mobile-nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
