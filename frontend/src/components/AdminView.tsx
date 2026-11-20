import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  createRestaurant,
  createRestaurantMenu,
  fetchRestaurants,
  type ApiRestaurant,
} from '../services/api';
import { compressImageToWebp } from '../utils/image';
import { CustomSelect } from './CustomSelect';

export function AdminView() {
  const [restaurants, setRestaurants] = useState<ApiRestaurant[]>([]);
  const [name, setName] = useState('');
  const [country, setCountry] = useState('España');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [photoInfo, setPhotoInfo] = useState('');
  const [creatingRest, setCreatingRest] = useState(false);

  const [selectedRestId, setSelectedRestId] = useState('');
  const [menuName, setMenuName] = useState('');
  const [menuPrice, setMenuPrice] = useState('');
  const [menuNotes, setMenuNotes] = useState('');
  const [creatingMenu, setCreatingMenu] = useState(false);

  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRestaurants()
      .then((list) => {
        setRestaurants(list);
        if (list[0]) setSelectedRestId(String(list[0].id));
      })
      .catch(() => {});
  }, []);

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

  const handleCreateRestaurant = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');
    if (!name.trim()) {
      setError('El nombre del restaurante es obligatorio.');
      return;
    }

    setCreatingRest(true);
    try {
      const created = await createRestaurant({
        name: name.trim(),
        country: country.trim() || 'España',
        province: province.trim(),
        city: city.trim(),
        photoDataUrl,
      });
      setRestaurants((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedRestId(String(created.id));
      setName('');
      setProvince('');
      setCity('');
      setPhotoDataUrl(undefined);
      setPhotoInfo('');
      setMsg(`Restaurante "${created.name}" creado correctamente.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando restaurante.');
    } finally {
      setCreatingRest(false);
    }
  };

  const handleCreateMenu = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');
    const restId = Number(selectedRestId);
    if (!restId) {
      setError('Selecciona un restaurante primero.');
      return;
    }

    setCreatingMenu(true);
    try {
      const menu = await createRestaurantMenu(restId, {
        name: menuName.trim(),
        priceEuros: Number(menuPrice),
        notes: menuNotes.trim(),
      });
      setRestaurants((prev) =>
        prev.map((r) => (r.id === restId ? { ...r, menus: [...r.menus, menu] } : r)),
      );
      setMenuName('');
      setMenuPrice('');
      setMenuNotes('');
      setMsg(`Menú "${menu.name}" añadido.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error añadiendo menú.');
    } finally {
      setCreatingMenu(false);
    }
  };

  return (
    <div className="app-shell tab-shell">
      <div className="app-card tab-card profile-card-airy">
        <div className="tab-header">
          <div className="profile-header-row">
            <h2>Configuración Admin ⚙️</h2>
            <span className="role-badge super">👑 Superuser</span>
          </div>
          <p>Solo visible para superusers: crea restaurantes, ubicaciones y precios de menús.</p>
        </div>

        <form className="admin-section-card" onSubmit={handleCreateRestaurant}>
          <h3>Nuevo restaurante</h3>

          <label className="field">
            <span>Nombre</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Sibuya Urban Sushi"
              required
            />
          </label>

          <div className="geo-filter-row">
            <label className="field">
              <span>País</span>
              <input
                className="input"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="España"
              />
            </label>
            <label className="field">
              <span>Provincia</span>
              <input
                className="input"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="Pontevedra"
              />
            </label>
            <label className="field">
              <span>Ciudad</span>
              <input
                className="input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Vigo"
              />
            </label>
          </div>

          <label className="photo-upload-box">
            <input type="file" accept="image/*" hidden onChange={handlePhotoChange} />
            <span className="photo-upload-icon">📷</span>
            <span className="photo-upload-text">
              {photoInfo ? `Foto lista: ${photoInfo}` : 'Añadir foto del local (opcional)'}
            </span>
          </label>
          {photoDataUrl && (
            <img src={photoDataUrl} alt="Vista previa del local" className="review-photo-preview" />
          )}

          <button type="submit" className="button button-primary full-width-btn" disabled={creatingRest}>
            {creatingRest ? 'Creando...' : 'Crear restaurante'}
          </button>
        </form>

        <form className="admin-section-card" onSubmit={handleCreateMenu}>
          <h3>Añadir precio de menú</h3>

          <label className="field">
            <span>Restaurante</span>
            <CustomSelect
              value={selectedRestId}
              placeholder="Selecciona un restaurante"
              options={restaurants.map((r) => ({
                value: String(r.id),
                label: r.city ? `${r.name} (${r.city})` : r.name,
              }))}
              onChange={setSelectedRestId}
            />
          </label>

          <div className="admin-menu-row">
            <label className="field">
              <span>Nombre del menú</span>
              <input
                className="input"
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
                placeholder="Ej. Buffet Noche"
                required
              />
            </label>
            <label className="field">
              <span>Precio (€)</span>
              <input
                className="input"
                type="number"
                step="0.01"
                min="1"
                value={menuPrice}
                onChange={(e) => setMenuPrice(e.target.value)}
                placeholder="21.90"
                required
              />
            </label>
          </div>

          <label className="field">
            <span>Notas (opcional)</span>
            <input
              className="input"
              value={menuNotes}
              onChange={(e) => setMenuNotes(e.target.value)}
              placeholder="Ej. Bebida aparte"
            />
          </label>

          <button
            type="submit"
            className="button button-outline-clean full-width-btn"
            disabled={creatingMenu || restaurants.length === 0}
          >
            {creatingMenu ? 'Guardando...' : 'Guardar menú'}
          </button>
        </form>

        {error && <p className="form-error">{error}</p>}
        {msg && <p className="profile-saved-msg">{msg}</p>}
      </div>
    </div>
  );
}
