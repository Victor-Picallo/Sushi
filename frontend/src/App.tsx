import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
const socket: Socket = io(backendUrl);

type Player = { id: string; name: string; score: number };
type Room = {
  id: string;
  players: Player[];
  creatorId: string;
  creatorName: string;
  creatorToken: string;
  isClosed: boolean;
};

function App() {
  const [inRoom, setInRoom] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [roomData, setRoomData] = useState<Room | null>(null);
  const [message, setMessage] = useState('');
  const [showRoomCreatedModal, setShowRoomCreatedModal] = useState(false);
  const [showPodium, setShowPodium] = useState(false);
  const [, setIsJoining] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [creatorToken, setCreatorToken] = useState(() => localStorage.getItem('creatorToken') || '');
  const [prevOrder, setPrevOrder] = useState<string[]>([]);
  const [movedPlayerIds, setMovedPlayerIds] = useState<string[]>([]);
  const prevRoomClosedRef = useRef(false);

  useEffect(() => {
    const handleRoomData = (data: Room) => {
      const sortedPlayers = [...data.players].sort((a, b) => b.score - a.score);
      const newOrder = sortedPlayers.map((player) => player.id);
      const movedIds = newOrder.filter((id, index) => {
        const previousIndex = prevOrder.indexOf(id);
        return previousIndex > -1 && previousIndex > index;
      });

      if (!creatorToken && data.creatorToken) {
        setCreatorToken(data.creatorToken);
        localStorage.setItem('creatorToken', data.creatorToken);
      }

      const justClosed = data.isClosed && !prevRoomClosedRef.current;
      prevRoomClosedRef.current = data.isClosed;

      setRoomData({ ...data, players: sortedPlayers });
      setPrevOrder(newOrder);
      setMovedPlayerIds(movedIds);
      setInRoom(true);
      setIsJoining(false);
      if (justClosed) {
        setShowPodium(true);
      }
    };

    const handleConnect = () => {
      if (typeof socket.id === 'string') {
        setPlayerId(socket.id);
      }
    };

    socket.on('room_data', handleRoomData);
    socket.on('connect', handleConnect);

    return () => {
      socket.off('room_data', handleRoomData);
      socket.off('connect', handleConnect);
    };
  }, [prevOrder]);

  useEffect(() => {
    const storedRoomId = localStorage.getItem('roomId');
    const storedUserName = localStorage.getItem('userName');
    const storedCreatorToken = localStorage.getItem('creatorToken') || '';

    if (!storedRoomId || !storedUserName) {
      return;
    }

    setRoomId(storedRoomId);
    setUserName(storedUserName);
    setCreatorToken(storedCreatorToken);
    setIsJoining(true);

    const emitJoin = () => {
      socket.emit('join_room', {
        roomId: storedRoomId,
        userName: storedUserName,
        creatorToken: storedCreatorToken,
      });
    };

    if (socket.connected) {
      emitJoin();
    } else {
      socket.on('connect', emitJoin);
    }

    return () => {
      socket.off('connect', emitJoin);
    };
  }, []);

  const createRoom = () => {
    if (!userName.trim()) {
      setMessage('Introduce tu nombre para continuar.');
      return;
    }

    const generatedId = Math.floor(1000 + Math.random() * 9000).toString();
    const generatedToken = creatorToken || crypto.randomUUID();
    setCreatorToken(generatedToken);
    setRoomId(generatedId);
    setMessage('');
    localStorage.setItem('roomId', generatedId);
    localStorage.setItem('userName', userName);
    localStorage.setItem('creatorToken', generatedToken);
    setIsJoining(true);
    setShowRoomCreatedModal(true);
    socket.emit(
      'join_room',
      { roomId: generatedId, userName, creatorToken: generatedToken },
      (room: Room) => {
        const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
        setRoomData({ ...room, players: sortedPlayers });
        setInRoom(true);
        setIsJoining(false);
      },
    );
  };

  const joinRoom = () => {
    if (!userName.trim()) {
      setMessage('Introduce tu nombre para continuar.');
      return;
    }

    if (!roomId.trim()) {
      setMessage('Introduce un ID de sala o crea una nueva.');
      return;
    }

    setMessage('');
    localStorage.setItem('roomId', roomId);
    localStorage.setItem('userName', userName);
    localStorage.setItem('creatorToken', creatorToken);
    setIsJoining(true);
    socket.emit(
      'join_room',
      { roomId, userName, creatorToken },
      (room: Room) => {
        const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
        setRoomData({ ...room, players: sortedPlayers });
        setInRoom(true);
        setIsJoining(false);
      },
    );
  };

  const updateScore = (amount: number) => {
    if (roomData?.isClosed) return;
    socket.emit('update_score', { roomId, amount });
  };

  const finishCount = () => {
    socket.emit('finish_count', { roomId }, (room: Room) => {
      if (room?.isClosed) {
        const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
        setRoomData({ ...room, players: sortedPlayers });
        setShowPodium(true);
      }
    });
  };

  const leaveRoom = () => {
    if (roomId) {
      socket.emit('leave_room', { roomId });
    }

    setInRoom(false);
    setRoomData(null);
    setRoomId('');
    setPrevOrder([]);
    setMovedPlayerIds([]);
    setShowRoomCreatedModal(false);
    setShowPodium(false);
    prevRoomClosedRef.current = false;
    localStorage.removeItem('roomId');
    localStorage.removeItem('creatorToken');
  };

  useEffect(() => {
    if (!movedPlayerIds.length) return;

    const timeout = window.setTimeout(() => {
      setMovedPlayerIds([]);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [movedPlayerIds]);

  const isRoomClosed = roomData?.isClosed;

  const getRankLabel = (index: number) => {
    if (index === 0) return '🏆';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  if (!inRoom) {
    return (
      <>
        <div className="app-shell">
          <div className="app-card">
            <div className="app-header">
              <h1 className="app-title">Sushi</h1>
              <p>Crea una sala nueva o únete a una existente para competir por el mejor score.</p>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Tu nombre</span>
                <input
                  className="input"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Tu nombre"
                />
              </label>

              <label className="field">
                <span>ID de la sala</span>
                <input
                  className="input"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Escribe o crea una sala"
                />
              </label>

              <div className="button-row">
                <button type="button" className="button button-create" onClick={createRoom}>
                  Crear sala
                </button>
                <button type="button" className="button button-primary" onClick={joinRoom}>
                  Entrar a la sala
                </button>
              </div>

              {message && <p className="form-error">{message}</p>}
            </div>
          </div>
        </div>
        {showPodium && roomData && (
          <div className="modal-overlay" onClick={() => setShowPodium(false)}>
            <div className="podium-card" onClick={(e) => e.stopPropagation()}>
              <h3>Podium final</h3>
              <p>Resultados de la partida</p>
              <ol className="podium-list">
                {roomData.players.slice(0, 3).map((player, index) => (
                  <li key={player.id} className={`podium-position position-${index + 1}`}>
                    <span className="podium-rank">
                      {index === 0 ? '🏆' : index === 1 ? '🥈' : '🥉'}
                    </span>
                    <span className="podium-name">{player.name.toUpperCase()}</span>
                    <span className="podium-score">{player.score} 🍣</span>
                  </li>
                ))}
              </ol>
              <button className="modal-close-button" onClick={() => setShowPodium(false)}>
                Cerrar
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="app-shell">
      {showRoomCreatedModal && (
        <div className="modal-overlay" onClick={() => setShowRoomCreatedModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Sala creada</h3>
            <p>Tu ID de sala es:</p>
            <strong>{roomId}</strong>
            <p>Has entrado automáticamente a la sala.</p>
            <button className="modal-close-button" onClick={() => setShowRoomCreatedModal(false)}>
              Continuar
            </button>
          </div>
        </div>
      )}

      <div className="app-card room-card">
        <div className="room-header">
          <button type="button" className="back-link" onClick={leaveRoom}>
            SALIR
          </button>
          <div>
            <p className="room-label">Sala</p>
            <h2>{roomId}</h2>
            <p className="room-subtitle">
              Dueño de la sesión: {(roomData?.creatorName ? roomData.creatorName.toUpperCase() : userName.toUpperCase())}
            </p>
          </div>
        </div>
        <div className="room-status-row">
          <div className="room-status-block">
            <div className={`status-chip ${isRoomClosed ? 'closed' : ''}`}>
              {isRoomClosed ? 'Recuento cerrado' : 'Partida en curso'}
            </div>
          </div>
          <div className="room-status-block room-status-action">
            {!isRoomClosed && (
              <button type="button" className="button button-secondary finish-button" onClick={finishCount}>
                Terminar recuento
              </button>
            )}
          </div>
        </div>

        {showPodium && roomData && (
          <div className="modal-overlay" onClick={() => setShowPodium(false)}>
            <div className="podium-card" onClick={(e) => e.stopPropagation()}>
              <h3>Podium final</h3>
              <p>Resultados de la partida</p>
              <ol className="podium-list">
                {roomData.players.slice(0, 3).map((player, index) => (
                  <li key={player.id} className={`podium-position position-${index + 1}`}>
                    <span className="podium-rank">
                      {index === 0 ? '🏆' : index === 1 ? '🥈' : '🥉'}
                    </span>
                    <span className="podium-name">{player.name.toUpperCase()}</span>
                    <span className="podium-score">{player.score} 🍣</span>
                  </li>
                ))}
              </ol>
              <button className="modal-close-button" onClick={() => setShowPodium(false)}>
                Cerrar
              </button>
            </div>
          </div>
        )}

        <section className="scoreboard">
          <div className="scoreboard-header">
            <div>
              <h3>Ranking 🏆</h3>
              <p>Actualiza tu propio score desde aquí.</p>
            </div>
          </div>

          {roomData?.players.length ? (
            <>
              {isRoomClosed && (
                <div className="room-message">
                  El creador cerró el recuento. Ya no se pueden modificar las piezas.
                </div>
              )}
              <ul className="player-list">
                {roomData.players.map((player, index) => {
                  const isCurrentPlayer = player.id === playerId || player.name === userName;
                  return (
                    <li key={player.id} className={`player-row ${movedPlayerIds.includes(player.id) ? 'player-moved' : ''}`}>
                      <div>
                        <span className="player-rank">{getRankLabel(index)}</span>
                        <span className="player-name">{player.name.toUpperCase()}</span>
                      </div>
                      <div className="player-actions">
                        <span className="player-score">{player.score} 🍣</span>
                        {isCurrentPlayer && !isRoomClosed && (
                          <div className="score-buttons">
                            <button className="small-button" onClick={() => updateScore(-1)}>-</button>
                            <button className="small-button" onClick={() => updateScore(1)}>+</button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="empty-state">
              <p>Aún no hay jugadores en la sala.</p>
              <p>Comparte el ID con tus amigos para comenzar.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;