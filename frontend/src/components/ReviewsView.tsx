import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
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
import { CustomSelect } from './CustomSelect';

type ReviewsViewProps = {
  userName: string;
};

export function ReviewsView({ userName }: ReviewsViewProps) {
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
    if (restList[0] && !restList.some((r) => String(r.id) === selectedRestaurantId)) {
      setSelectedRestaurantId(String(restList[0].id));
    } else if (restList.length === 0) {
      setSelectedRestaurantId('');
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

  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeRestaurant) {
      setError('Selecciona un restaurante primero (un superuser debe crearlo en Config).');
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
      <div className="app-card tab-card profile-card-airy">
        <div className="tab-header">
          <h2>{t('reviews.title')}</h2>
          <p>{t('reviews.subtitle')}</p>
        </div>

        <div className="geo-filter-row">
          <CustomSelect
            value={filterCountry}
            placeholder={t('reviews.allCountries')}
            options={[
              { value: '', label: t('reviews.allCountries') },
              ...filters.countries.map((c) => ({ value: c, label: c })),
            ]}
            onChange={setFilterCountry}
          />
          <CustomSelect
            value={filterProvince}
            placeholder={t('reviews.allProvinces')}
            options={[
              { value: '', label: t('reviews.allProvinces') },
              ...filters.provinces.map((p) => ({ value: p, label: p })),
            ]}
            onChange={setFilterProvince}
          />
          <CustomSelect
            value={filterCity}
            placeholder={t('reviews.allCities')}
            options={[
              { value: '', label: t('reviews.allCities') },
              ...filters.cities.map((c) => ({ value: c, label: c })),
            ]}
            onChange={setFilterCity}
          />
        </div>

        <label className="field">
          <span>Restaurante</span>
          <CustomSelect
            value={selectedRestaurantId}
            placeholder="Sin restaurantes aún"
            options={
              restaurants.length > 0
                ? restaurants.map((r) => ({
                    value: String(r.id),
                    label: r.city ? `${r.name} (${r.city})` : r.name,
                  }))
                : [{ value: '', label: 'Sin restaurantes aún' }]
            }
            onChange={setSelectedRestaurantId}
          />
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

          <div className="field">
            <span>{t('reviews.photo')}</span>
            <label className="photo-upload-box">
              <input type="file" accept="image/*" hidden onChange={handlePhotoChange} />
              <span className="photo-upload-icon">📷</span>
              <span className="photo-upload-text">
                {photoInfo ? `Foto lista: ${photoInfo}` : 'Toca para añadir una foto'}
              </span>
            </label>
            {photoPreviewUrl && (
              <div className="photo-preview-wrap">
                <img src={photoPreviewUrl} alt="Vista previa" className="review-photo-preview" />
                <button
                  type="button"
                  className="button button-outline-clean small-remove-photo"
                  onClick={() => {
                    setPhotoPreviewUrl(undefined);
                    setPhotoInfo('');
                  }}
                >
                  Quitar foto
                </button>
              </div>
            )}
          </div>

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

          <button type="submit" className="button button-primary full-width-btn" disabled={isSubmitting}>
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
