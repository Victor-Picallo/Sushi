import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createRestaurant,
  createRestaurantMenu,
  createReview,
  fetchRestaurantFilters,
  fetchRestaurants,
  fetchReviews,
  type ApiRestaurant,
  type ApiRestaurantFilters,
  type ApiReview,
} from '../services/api';
import { compressImageToWebp } from '../utils/image';
import { ensurePlayerToken } from '../utils/session';

type ReviewsViewProps = {
  userName: string;
  isSuperuser: boolean;
};

export function ReviewsView({ userName, isSuperuser }: ReviewsViewProps) {
  const { t } = useTranslation();

  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [restaurants, setRestaurants] = useState<ApiRestaurant[]>([]);
  const [filters, setFilters] = useState<ApiRestaurantFilters>({
    countries: [],
    provinces: [],
    cities: [],
  });
  const [filterCountry, setFilterCountry] = useState('');
  const [filterProvince, setFilterProvince] = useState('');
  const [filterCity, setFilterCity] = useState('');

  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const [pieceName, setPieceName] = useState('');
  const [tasteScore, setTasteScore] = useState(5);
  const [sizeScore, setSizeScore] = useState(4);
  const [presentationScore, setPresentationScore] = useState(4);
  const [comment, setComment] = useState('');
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | undefined>(undefined);
  const [photoInfo, setPhotoInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Superuser forms
  const [showNewRestForm, setShowNewRestForm] = useState(false);
  const [newRestName, setNewRestName] = useState('');
  const [newRestCountry, setNewRestCountry] = useState('España');
  const [newRestProvince, setNewRestProvince] = useState('');
  const [newRestCity, setNewRestCity] = useState('');
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuPrice, setNewMenuPrice] = useState('');
  const [adminMsg, setAdminMsg] = useState('');

  const loadRestaurantsData = async (geo?: {
    country?: string;
    province?: string;
    city?: string;
  }) => {
    const [restList, filterOpts] = await Promise.all([
      fetchRestaurants(geo),
      fetchRestaurantFilters(),
    ]);
    setRestaurants(restList);
    setFilters(filterOpts);
    if (!selectedRestaurantId && restList[0]) {
      setSelectedRestaurantId(String(restList[0].id));
    }
  };

  useEffect(() => {
    Promise.all([fetchReviews(), loadRestaurantsData()])
      .then(([revList]) => setReviews(revList))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadRestaurantsData({
      country: filterCountry || undefined,
      province: filterProvince || undefined,
      city: filterCity || undefined,
    }).catch(() => {});
  }, [filterCountry, filterProvince, filterCity]);

  const activeRestaurant = restaurants.find((r) => String(r.id) === selectedRestaurantId);

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { dataUrl, blob } = await compressImageToWebp(file);
      setPhotoPreviewUrl(dataUrl);
      setPhotoInfo(`WebP (${Math.round(blob.size / 1024)} KB)`);
    } catch {
      setError('No se pudo procesar la imagen.');
    }
  };

  const handleCreateRestaurant = async (e: FormEvent) => {
    e.preventDefault();
    setAdminMsg('');
    try {
      const created = await createRestaurant({
        name: newRestName,
        country: newRestCountry,
        province: newRestProvince,
        city: newRestCity,
      });
      setRestaurants((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedRestaurantId(String(created.id));
      setNewRestName('');
      setNewRestProvince('');
      setNewRestCity('');
      setShowNewRestForm(false);
      setAdminMsg('Restaurante creado.');
      loadRestaurantsData().catch(() => {});
    } catch (err) {
      setAdminMsg(err instanceof Error ? err.message : 'Error creando restaurante.');
    }
  };

  const handleAddMenu = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeRestaurant) return;
    setAdminMsg('');
    try {
      const menu = await createRestaurantMenu(activeRestaurant.id, {
        name: newMenuName,
        priceEuros: Number(newMenuPrice),
      });
      setRestaurants((prev) =>
        prev.map((r) =>
          r.id === activeRestaurant.id ? { ...r, menus: [...r.menus, menu] } : r,
        ),
      );
      setNewMenuName('');
      setNewMenuPrice('');
      setAdminMsg('Menú añadido.');
    } catch (err) {
      setAdminMsg(err instanceof Error ? err.message : 'Error añadiendo menú.');
    }
  };

  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeRestaurant) {
      setError('Selecciona un restaurante primero.');
      return;
    }
    if (!pieceName.trim()) {
      setError('Escribe el nombre de la pieza (ej. Nigiri salmón).');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const created = await createReview({
        playerToken: ensurePlayerToken(),
        authorName: userName.trim() || 'Anónimo',
        pieceName: pieceName.trim(),
        restaurantId: activeRestaurant.id,
        tasteScore,
        sizeScore,
        presentationScore,
        comment: comment.trim(),
        photoDataUrl: photoPreviewUrl,
      });

      setReviews((prev) => [created, ...prev]);
      setPieceName('');
      setTasteScore(5);
      setSizeScore(4);
      setPresentationScore(4);
      setComment('');
      setPhotoPreviewUrl(undefined);
      setPhotoInfo('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la valoración.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-shell tab-shell">
      <div className="app-card tab-card">
        <div className="tab-header">
          <h2>{t('reviews.title')}</h2>
          <p>{t('reviews.subtitle')}</p>
        </div>

        {(restaurants.length > 0 || filters.countries.length > 0) && (
          <div className="geo-filter-row">
            <select
              className="input"
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
            >
              <option value="">{t('reviews.allCountries')}</option>
              {filters.countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={filterProvince}
              onChange={(e) => setFilterProvince(e.target.value)}
            >
              <option value="">{t('reviews.allProvinces')}</option>
              {filters.provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
            >
              <option value="">{t('reviews.allCities')}</option>
              {filters.cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        <label className="field">
          <span>Restaurante</span>
          <select
            className="input"
            value={selectedRestaurantId}
            onChange={(e) => setSelectedRestaurantId(e.target.value)}
          >
            {restaurants.length === 0 && <option value="">Sin restaurantes aún</option>}
            {restaurants.map((r) => (
              <option key={r.id} value={String(r.id)}>
                {r.name} {r.city ? `(${r.city})` : ''}
              </option>
            ))}
          </select>
        </label>

        {activeRestaurant && (
          <div className="menus-card">
            <div className="menus-card-header">
              <strong>{t('reviews.menusTitle')}</strong>
              <span className="menus-location">
                {[activeRestaurant.city, activeRestaurant.province, activeRestaurant.country]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
            {activeRestaurant.menus.length === 0 ? (
              <p className="muted small-text">{t('reviews.noMenus')}</p>
            ) : (
              <div className="menus-pills">
                {activeRestaurant.menus.map((m) => (
                  <span key={m.id} className="menu-pill">
                    {m.name}: <strong>{(m.priceCents / 100).toFixed(2)} €</strong>
                  </span>
                ))}
              </div>
            )}

            {isSuperuser && (
              <form className="inline-menu-form" onSubmit={handleAddMenu}>
                <input
                  className="input"
                  value={newMenuName}
                  onChange={(e) => setNewMenuName(e.target.value)}
                  placeholder={t('reviews.menuName')}
                  required
                />
                <input
                  className="input price-input"
                  type="number"
                  step="0.01"
                  min="1"
                  value={newMenuPrice}
                  onChange={(e) => setNewMenuPrice(e.target.value)}
                  placeholder="€"
                  required
                />
                <button type="submit" className="button button-secondary">
                  {t('reviews.addMenu')}
                </button>
              </form>
            )}
          </div>
        )}

        {isSuperuser && (
          <div className="superuser-panel">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setShowNewRestForm((prev) => !prev)}
            >
              {t('reviews.addRestaurant')}
            </button>
            {showNewRestForm && (
              <form className="review-form" onSubmit={handleCreateRestaurant}>
                <input
                  className="input"
                  value={newRestName}
                  onChange={(e) => setNewRestName(e.target.value)}
                  placeholder={t('reviews.restaurantName')}
                  required
                />
                <div className="geo-filter-row">
                  <input
                    className="input"
                    value={newRestCountry}
                    onChange={(e) => setNewRestCountry(e.target.value)}
                    placeholder={t('reviews.country')}
                  />
                  <input
                    className="input"
                    value={newRestProvince}
                    onChange={(e) => setNewRestProvince(e.target.value)}
                    placeholder={t('reviews.province')}
                  />
                  <input
                    className="input"
                    value={newRestCity}
                    onChange={(e) => setNewRestCity(e.target.value)}
                    placeholder={t('reviews.city')}
                  />
                </div>
                <button type="submit" className="button button-primary">
                  Crear restaurante
                </button>
              </form>
            )}
            {adminMsg && <p className="profile-saved-msg">{adminMsg}</p>}
          </div>
        )}

        <form className="review-form" onSubmit={handleSubmitReview}>
          <label className="field">
            <span>{t('reviews.pieceName')}</span>
            <input
              className="input"
              value={pieceName}
              onChange={(e) => setPieceName(e.target.value)}
              placeholder="Ej. Nigiri de salmón flambeado"
            />
          </label>

          <div className="rating-grid">
            <label className="rating-box">
              <span>
                {t('reviews.taste')} ({tasteScore}/5)
              </span>
              <input
                type="range"
                min={1}
                max={5}
                value={tasteScore}
                onChange={(e) => setTasteScore(Number(e.target.value))}
              />
            </label>
            <label className="rating-box">
              <span>
                {t('reviews.size')} ({sizeScore}/5)
              </span>
              <input
                type="range"
                min={1}
                max={5}
                value={sizeScore}
                onChange={(e) => setSizeScore(Number(e.target.value))}
              />
            </label>
            <label className="rating-box">
              <span>
                {t('reviews.presentation')} ({presentationScore}/5)
              </span>
              <input
                type="range"
                min={1}
                max={5}
                value={presentationScore}
                onChange={(e) => setPresentationScore(Number(e.target.value))}
              />
            </label>
          </div>

          <label className="field">
            <span>{t('reviews.photo')}</span>
            <input type="file" accept="image/*" className="file-input" onChange={handlePhotoChange} />
            {photoInfo && <small className="photo-hint">{photoInfo}</small>}
            {photoPreviewUrl && (
              <img src={photoPreviewUrl} alt="Vista previa" className="review-photo-preview" />
            )}
          </label>

          <label className="field">
            <span>{t('reviews.notes')}</span>
            <textarea
              className="input review-textarea"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="¿Arroz en su punto? ¿Buen corte?"
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="button button-primary" disabled={isSubmitting}>
            {isSubmitting ? t('reviews.saving') : t('reviews.saveReview')}
          </button>
        </form>

        {reviews.length > 0 && (
          <div className="reviews-list">
            {reviews.map((item) => {
              const avg = ((item.tasteScore + item.sizeScore + item.presentationScore) / 3).toFixed(1);
              return (
                <article key={item.id} className="review-card">
                  <div className="review-card-top">
                    <div>
                      <strong>{item.pieceName}</strong>
                      <span className="review-place"> · {item.restaurantName}</span>
                    </div>
                    <span className="review-avg">⭐ {avg}</span>
                  </div>
                  <p className="review-scores">
                    {t('reviews.taste')} {item.tasteScore}/5 · {t('reviews.size')} {item.sizeScore}/5 ·{' '}
                    {t('reviews.presentation')} {item.presentationScore}/5
                  </p>
                  {item.comment && <p className="review-comment">{item.comment}</p>}
                  {item.photoUrl && (
                    <img src={item.photoUrl} alt={item.pieceName} className="review-card-img" />
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
