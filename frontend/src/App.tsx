import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';

const FUNNY_CELEBRATION_ITEMS = [
  {
    title: "¡ENTRANDO EN RITMO! 🥢✨",
    subtitle: "¡10 piezas adentro! El paladar ya está bien despierto.",
    gifUrl: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Z6cW9vNXo3Z3pmMDk5Z29pZXZ5M2pxOW16Mmc3dndocnd6a2hicyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Lq0h93752f6J9tijrh/giphy.gif"
  },
  {
    title: "¡MÁQUINA DE TRAGAR! 🔥🤤",
    subtitle: "¡20 piezas! Tu estómago empieza a desafiar las leyes de la física.",
    gifUrl: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExT3RzbGJjNHEzeHRqZ2Z5dXFsdGFsbjVvaG1xdG5xMzRpaWp5bjVibCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/12uXi1GXBibALC/giphy.gif"
  },
  {
    title: "¡¡LEGEN-SUSHI-DARIO!! 🐉💥",
    subtitle: "¡30 piezas! Los chefs de la cocina acaban de pedir refuerzos.",
    gifUrl: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExeGJwbmFqMjFhM3lyNDdrYmkzb3VudndpdWl5dnp3eXZzOG05emtwOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7btXkbsV26U95Uly/giphy.gif"
  },
  {
    title: "¡¡MODO MONSTRUO DEL WASABI!! 👾🌶️",
    subtitle: "¡40 piezas! Tu apetito ya no conoce límites humanos.",
    gifUrl: "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExenN4aTFnaTFpZjA4OWZ0aW1wOXV1ejZxdXpucXZqNDI5ZHJvdjlyeCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/tsX3YMWYzDPjAARfeg/giphy.gif"
  },
  {
    title: "¡¡SUSHI MASTER ABSOLUTO!! 🥇🏆",
    subtitle: "¡50 piezas tragadas! ¡Has alcanzado el primer gran objetivo!",
    gifUrl: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZydmsxdWV6bzVvdnp3cmg0Zm5kNDlsNm0zeHQ5bjE3azIxdWNkYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xT1R9B7cgalypD2a2s/giphy.gif"
  },
  {
    title: "¡DESTRUCTORES DE ROLLOS! 🚀🌊",
    subtitle: "¡60 piezas! Los peces del océano tiemblan a tu paso.",
    gifUrl: "https://media.giphy.com/media/H986cBWlQH0PXjcLQO/giphy.gif"
  },
  {
    title: "¡¡QUEBRANDO EL BUFET LIBRE!! 💰🍱",
    subtitle: "¡70 piezas! El dueño del restaurante está llorando en la esquina.",
    gifUrl: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXlmcWFicnppNzhocXBna2tudXZocnllNXkyMnJsaWtyZXoxdHZsNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Zk9mW5OmXTz9e/giphy.gif"
  },
  {
    title: "¡¡PODER CÓSMICO DEL NIGIRI!! 🌌🍙",
    subtitle: "¡80 piezas! ¿Dónde estás metiendo todo ese arroz?",
    gifUrl: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExaG9iYnA5bWFwbWoxOTc0MWRvOTUzNmlybzljazN2ZXdydXR5OGs4OCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPa2TdahY8LAAxy/giphy.gif"
  },
  {
    title: "¡¡AMENAZA GASTRONÓMICA MUNDIAL!! ⚠️⚡",
    subtitle: "¡90 piezas! Se activa la alerta máxima en la barra de sushi.",
    gifUrl: "https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif"
  },
  {
    title: "¡¡DIOS SUPREMO DE LA MITOLOGÍA SUSHI!! 👑🍣⚡",
    subtitle: "¡¡100+ PIEZAS!! ¡RÉCORD DE LA HISTORIA! Te han nombrado Leyenda Imparable.",
    gifUrl: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnB0ZjBtdXZvdWVwb20xNzk4YjFtbDFndDdsanMwbTgxcnVqNjdzOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ffoUuIn1qRz7G/giphy.gif"
  }
];

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
  const [floatingSushi, setFloatingSushi] = useState<{ id: number; x: number; y: number }[]>([]);
  const prevRoomClosedRef = useRef(false);

  // Fullscreen celebration overlay state
  const [celebration, setCelebration] = useState<{
    show: boolean;
    score: number;
    title: string;
    subtitle: string;
    gifUrl: string;
  } | null>(null);
  const prevScoreRef = useRef<number | null>(null);

  const fireConfetti = () => {
    // Launch fireworks style confetti explosions
    const duration = 2.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#9254de', '#ff4d4f', '#ffc53d', '#73d13d', '#ff85c0', '#13c2c2']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ff4d4f', '#ffc53d', '#73d13d', '#ff85c0', '#9254de', '#13c2c2']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  useEffect(() => {
    const handleRoomData = (data: Room) => {
      const sortedPlayers = [...data.players].sort((a, b) => b.score - a.score);
      const newOrder = sortedPlayers.map((player) => player.id);
      const movedIds = newOrder.filter((id, index) => {
        const previousIndex = prevOrder.indexOf(id);
        return previousIndex > -1 && previousIndex > index;
      });

      if (typeof socket.id === 'string') {
        setPlayerId(socket.id);
      }

      if (!creatorToken && data.creatorToken) {
        setCreatorToken(data.creatorToken);
        localStorage.setItem('creatorToken', data.creatorToken);
      }

      const justClosed = data.isClosed && !prevRoomClosedRef.current;
      prevRoomClosedRef.current = data.isClosed;

      const me = getCurrentPlayer(sortedPlayers);
      if (me) {
        const currentScore = me.score;
        const previousScore = prevScoreRef.current;
        if (
          previousScore !== null &&
          currentScore > previousScore &&
          currentScore > 0 &&
          currentScore % 10 === 0
        ) {
          const itemIndex = Math.min(Math.floor(currentScore / 10) - 1, FUNNY_CELEBRATION_ITEMS.length - 1);
          const celebrationItem = FUNNY_CELEBRATION_ITEMS[itemIndex];
          setCelebration({
            show: true,
            score: currentScore,
            title: celebrationItem.title,
            subtitle: celebrationItem.subtitle,
            gifUrl: celebrationItem.gifUrl
          });
          fireConfetti();
        }
        prevScoreRef.current = currentScore;
      }

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

    const normalizedRoomId = roomId.trim();

    if (!/^\d{4}$/.test(normalizedRoomId)) {
      setMessage('El ID de la sala debe tener 4 dígitos.');
      return;
    }

    setMessage('');
    localStorage.setItem('roomId', normalizedRoomId);
    localStorage.setItem('userName', userName);
    localStorage.setItem('creatorToken', creatorToken);
    setIsJoining(true);
    socket.emit(
      'join_room',
      { roomId: normalizedRoomId, userName, creatorToken },
      (room: Room) => {
        const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
        setRoomData({ ...room, players: sortedPlayers });
        if (typeof socket.id === 'string') {
          setPlayerId(socket.id);
        }
        setInRoom(true);
        setIsJoining(false);
      },
    );
  };

  const updateScore = (amount: number) => {
    if (!roomId || roomData?.isClosed) return;

    const playerInRoom = getCurrentPlayer(roomData?.players ?? []);
    if (!playerInRoom) {
      setMessage('Tu sesión de sala no está activa en este momento. Vuelve a entrar.');
      return;
    }

    if (amount > 0) {
      const id = Date.now() + Math.random();
      setFloatingSushi((current) => [...current, { id, x: 52, y: 10 }]);
      window.setTimeout(() => {
        setFloatingSushi((current) => current.filter((item) => item.id !== id));
      }, 850);
    }

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
  const totalRoomScore = roomData?.players.reduce((sum, player) => sum + player.score, 0) ?? 0;
  const currentUserNameKey = userName.trim().toLowerCase();

  const getCurrentPlayer = (players: Player[] = []) =>
    players.find(
      (player) =>
        player.id === socket.id ||
        player.id === playerId ||
        (currentUserNameKey && player.name.trim().toLowerCase() === currentUserNameKey),
    ) ?? null;

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
              <div className="app-title-wrap">
                <h1 className="app-title">SUSHI</h1>
              </div>
              <div className="app-jp">寿司屋</div>
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
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  onChange={(e) => setRoomId(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="ID de la sesion"
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
        <div className="room-top-bar">
          <button type="button" className="back-link" onClick={leaveRoom}>
            Salir
          </button>
          <div className={`status-chip ${isRoomClosed ? 'closed' : ''}`}>
            {isRoomClosed ? 'Recuento cerrado' : 'Partida en curso'}
          </div>
        </div>

        <div className="room-header">
          <p className="room-label">Sala</p>
          <h2>{roomId}</h2>
          <p className="room-subtitle">
            Dueño de la sesión: <span>{(roomData?.creatorName ? roomData.creatorName.toUpperCase() : userName.toUpperCase())}</span>
          </p>
        </div>

        {!isRoomClosed && (
          <div className="room-action-container">
            <div className="room-total-counter" aria-live="polite">
              <span className="room-total-label">Total sala</span>
              <strong>{totalRoomScore}</strong>
              <span className="room-total-unit">🍣</span>
            </div>
            <button type="button" className="button button-secondary finish-button" onClick={finishCount}>
              Terminar recuento
            </button>
          </div>
        )}

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
                  const isCurrentPlayer =
                    player.id === socket.id ||
                    player.id === playerId ||
                    player.name.trim().toLowerCase() === currentUserNameKey;
                  return (
                    <li key={player.id} className={`player-row ${movedPlayerIds.includes(player.id) ? 'player-moved' : ''}`}>
                      <div>
                        <span className="player-rank">{getRankLabel(index)}</span>
                        <span className="player-name">{player.name.toUpperCase()}</span>
                      </div>
                      <div className="player-actions">
                        <div className="score-badge-wrap">
                          <span className="player-score">{player.score} 🍣</span>
                          {isCurrentPlayer && floatingSushi.length > 0 && floatingSushi.map((item) => (
                            <span key={item.id} className="floating-sushi" style={{ left: `${item.x}%`, top: `${item.y}%` }} aria-hidden="true">
                              🍣
                            </span>
                          ))}
                        </div>
                        {isCurrentPlayer && !isRoomClosed && (
                          <div className="score-buttons">
                            <button type="button" className="small-button" onClick={() => updateScore(-1)}>-</button>
                            <button type="button" className="small-button" onClick={() => updateScore(1)}>+</button>
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

      {celebration && celebration.show && (
        <div className="celebration-overlay" onClick={() => setCelebration(null)}>
          <div className="celebration-card" onClick={(e) => e.stopPropagation()}>
            <div className="celebration-badge">{celebration.score} PIEZAS 🍣</div>
            <h2 className="celebration-title">{celebration.title}</h2>
            <div className="celebration-media">
              <img src={celebration.gifUrl} alt="Celebración Graciosa" className="celebration-gif" />
            </div>
            <p className="celebration-subtitle">{celebration.subtitle}</p>
            <button
              type="button"
              className="button button-primary celebration-button"
              onClick={() => setCelebration(null)}
            >
              ¡Seguir comiendo! 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;