import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  createRestaurant,
  createRestaurantMenu,
  deleteRestaurant,
  deleteRestaurantMenu,
  fetchRestaurants,
  updateRestaurantMenu,
  type ApiRestaurant,
  type ApiRestaurantMenu,
} from '../services/api';
import { compressImageToWebp } from '../utils/image';
import { CustomSelect } from './CustomSelect';
import { TrashIcon } from './Icons';

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
  const [editingMenuId, setEditingMenuId] = useState<number | null>(null);
  const [menuName, setMenuName] = useState('');
  const [menuSchedule, setMenuSchedule] = useState('');
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

  const activeRest = restaurants.find((r) => String(r.id) === selectedRestId);

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

  const resetMenuForm = () => {
    setEditingMenuId(null);
    setMenuName('');
    setMenuSchedule('');
    setMenuPrice('');
    setMenuNotes('');
  };

  const startEditMenu = (m: ApiRestaurantMenu) => {
    setEditingMenuId(m.id);
    setMenuName(m.name);
    setMenuSchedule(m.schedule || '');
    setMenuPrice((m.priceCents / 100).toFixed(2));
    setMenuNotes(m.notes || '');
  };

  const handleSaveMenu = async (e: FormEvent) => {
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
      if (editingMenuId) {
        const updated = await updateRestaurantMenu(restId, editingMenuId, {
          name: menuName.trim(),
          schedule: menuSchedule.trim(),
          priceEuros: Number(menuPrice),
          notes: menuNotes.trim(),
        });
        setRestaurants((prev) =>
          prev.map((r) =>
            r.id === restId
              ? { ...r, menus: r.menus.map((m) => (m.id === editingMenuId ? updated : m)) }
              : r,
          ),
        );
        setMsg(`Menú "${updated.name}" actualizado.`);
      } else {
        const menu = await createRestaurantMenu(restId, {
          name: menuName.trim(),
          schedule: menuSchedule.trim(),
          priceEuros: Number(menuPrice),
          notes: menuNotes.trim(),
        });
        setRestaurants((prev) =>
          prev.map((r) => (r.id === restId ? { ...r, menus: [...r.menus, menu] } : r)),
        );
        setMsg(`Menú "${menu.name}" añadido.`);
      }
      resetMenuForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando menú.');
    } finally {
      setCreatingMenu(false);
    }
  };

  const handleDeleteMenu = async (menuId: number) => {
    const restId = Number(selectedRestId);
    if (!restId) return;
    try {
      await deleteRestaurantMenu(restId, menuId);
      setRestaurants((prev) =>
        prev.map((r) =>
          r.id === restId ? { ...r, menus: r.menus.filter((m) => m.id !== menuId) } : r,
        ),
      );
      if (editingMenuId === menuId) resetMenuForm();
      setMsg('Menú eliminado.');
    } catch {
      setError('No se pudo eliminar el menú.');
    }
  };

  const handleDeleteRestaurant = async () => {
    if (!activeRest) return;
    try {
      await deleteRestaurant(activeRest.id);
      const remaining = restaurants.filter((r) => r.id !== activeRest.id);
      setRestaurants(remaining);
      setSelectedRestId(remaining[0] ? String(remaining[0].id) : '');
      resetMenuForm();
      setMsg(`Restaurante "${activeRest.name}" eliminado.`);
    } catch {
      setError('No se pudo eliminar el restaurante.');
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
          <p>Solo visible para superusers: gestiona restaurantes, ubicaciones y menús.</p>
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

        <form className="admin-section-card" onSubmit={handleSaveMenu}>
          <div className="profile-header-row">
            <h3>{editingMenuId ? 'Editar menú' : 'Gestionar menús'}</h3>
            {activeRest && (
              <button
                type="button"
                className="remove-history-btn"
                title={`Eliminar ${activeRest.name}`}
                onClick={handleDeleteRestaurant}
              >
                <TrashIcon />
              </button>
            )}
          </div>

          <label className="field">
            <span>Restaurante</span>
            <CustomSelect
              value={selectedRestId}
              placeholder="Selecciona un restaurante"
              options={restaurants.map((r) => ({
                value: String(r.id),
                label: r.city ? `${r.name} (${r.city})` : r.name,
              }))}
              onChange={(val) => {
                setSelectedRestId(val);
                resetMenuForm();
              }}
            />
          </label>

          {activeRest && activeRest.menus.length > 0 && (
            <div className="admin-menu-list">
              {activeRest.menus.map((m) => (
                <div key={m.id} className="admin-menu-item">
                  <div className="admin-menu-info">
                    <strong>
                      {m.name} {m.schedule ? `(${m.schedule})` : ''} · {(m.priceCents / 100).toFixed(2)} €
                    </strong>
                    {m.notes && <span className="muted small-text">{m.notes}</span>}
                  </div>
                  <div className="recent-room-actions">
                    <button
                      type="button"
                      className="room-mini-btn"
                      onClick={() => startEditMenu(m)}
                      title="Editar menú"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="remove-history-btn"
                      onClick={() => handleDeleteMenu(m.id)}
                      title="Eliminar menú"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="admin-menu-row">
            <label className="field">
              <span>Nombre del menú</span>
              <input
                className="input"
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
                placeholder="Ej. Menú Infinity"
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
                placeholder="18.80"
                required
              />
            </label>
          </div>

          <label className="field">
            <span>Horario / Turno</span>
            <input
              className="input"
              value={menuSchedule}
              onChange={(e) => setMenuSchedule(e.target.value)}
              placeholder="Ej. Mediodía / Cena / Fin de semana"
            />
          </label>

          <label className="field">
            <span>Notas (opcional)</span>
            <input
              className="input"
              value={menuNotes}
              onChange={(e) => setMenuNotes(e.target.value)}
              placeholder="Ej. Lunes a viernes no festivos"
            />
          </label>

          <div className="button-row clean-button-row">
            <button
              type="submit"
              className="button button-primary"
              disabled={creatingMenu || restaurants.length === 0}
            >
              {creatingMenu ? 'Guardando...' : editingMenuId ? 'Actualizar menú' : 'Guardar menú'}
            </button>
            {editingMenuId && (
              <button type="button" className="button button-outline-clean" onClick={resetMenuForm}>
                Cancelar
              </button>
            )}
          </div>
        </form>

        {error && <p className="form-error">{error}</p>}
        {msg && <p className="profile-saved-msg">{msg}</p>}
      </div>
    </div>
  );
}
