import { useEffect, useRef, useState } from 'react';
import { FUNNY_CELEBRATION_ITEMS } from './constants/celebrations';
import { checkOAuthSession, getStoredAuthToken } from './services/auth';
import { socket } from './services/socket';
import type {
  AppTab,
  CelebrationState,
  Player,
  Room,
  RoomHistoryItem,
  RoomSummary,
} from './types/sushi';
import { fireConfetti } from './utils/confetti';
import {
  ensurePlayerToken,
  generateCreatorToken,
  loadRoomHistory,
  saveRoomHistory,
} from './utils/session';
import { AuthView } from './components/AuthView';
import { BottomNav } from './components/BottomNav';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { HistoryView } from './components/HistoryView';
import { LandingView } from './components/LandingView';
import { PodiumModal } from './components/PodiumModal';
import { ProfileView } from './components/ProfileView';
import { ReviewsView } from './components/ReviewsView';
import { RoomCreatedModal } from './components/RoomCreatedModal';
import { RoomView } from './components/RoomView';

function App() {
  const [authToken, setAuthToken] = useState(() => getStoredAuthToken());
  const [activeTab, setActiveTab] = useState<AppTab>('room');

  useEffect(() => {
    if (authToken) return;
    checkOAuthSession().then((session) => {
      if (session) {
        setAuthToken(session.token);
        setUserName(session.displayName);
      }
    });
  }, [authToken]);
  const [inRoom, setInRoom] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');
  const [roomData, setRoomData] = useState<Room | null>(null);
  const [message, setMessage] = useState('');
  const [showRoomCreatedModal, setShowRoomCreatedModal] = useState(false);
  const [showPodium, setShowPodium] = useState(false);
  const [, setIsJoining] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [creatorToken, setCreatorToken] = useState(() => localStorage.getItem('creatorToken') || '');
  const [movedPlayerIds, setMovedPlayerIds] = useState<string[]>([]);
  const [floatingSushi, setFloatingSushi] = useState<{ id: number; x: number; y: number }[]>([]);
  const [roomHistory, setRoomHistory] = useState<RoomHistoryItem[]>(loadRoomHistory);
  const [roomsSummaryMap, setRoomsSummaryMap] = useState<Record<string, RoomSummary>>({});
  const [celebration, setCelebration] = useState<CelebrationState | null>(null);

  const userWantsLandingRef = useRef(false);
  const prevRoomClosedRef = useRef(false);
  const prevOrderRef = useRef<string[]>([]);
  const sessionRestoreKeyRef = useRef<string | null>(null);
  const reconnectLockRef = useRef(false);
  const lastKnownRoomRef = useRef<string | null>(null);
  const rejoinGuardRef = useRef<string | null>(null);
  const prevScoreRef = useRef<number | null>(null);

  const currentUserNameKey = userName.trim().toLowerCase();

  const getCurrentPlayer = (players: Player[] = []) => {
    const currentToken = localStorage.getItem('playerToken');
    return (
      players.find(
        (player) =>
          (currentToken && player.playerToken && player.playerToken === currentToken) ||
          player.id === socket.id ||
          player.id === playerId ||
          (currentUserNameKey && player.name.trim().toLowerCase() === currentUserNameKey),
      ) ?? null
    );
  };

  const addToHistory = (id: string, name: string, token?: string, isClosed = false) => {
    setRoomHistory((prev) => {
      const filtered = prev.filter((item) => item.roomId !== id);
      const updated = [
        { roomId: id, userName: name, creatorToken: token, lastJoinedAt: Date.now(), isClosed },
        ...filtered,
      ].slice(0, 10);
      saveRoomHistory(updated);
      return updated;
    });
  };

  const updateHistoryClosedState = (
    id: string,
    isClosed: boolean,
    players?: { name: string; score: number }[],
  ) => {
    setRoomHistory((prev) => {
      const updated = prev.map((item) =>
        item.roomId === id
          ? {
              ...item,
              isClosed,
              finalPlayers: players && players.length > 0 ? players : item.finalPlayers,
            }
          : item,
      );
      saveRoomHistory(updated);
      return updated;
    });
  };

  const removeFromHistory = (id: string) => {
    setRoomHistory((prev) => {
      const updated = prev.filter((item) => item.roomId !== id);
      saveRoomHistory(updated);
      return updated;
    });
  };

  const persistRoomSession = (
    nextRoomId: string,
    nextUserName: string,
    nextCreatorToken: string = creatorToken,
  ) => {
    localStorage.setItem('roomId', nextRoomId);
    localStorage.setItem('userName', nextUserName);
    if (nextCreatorToken) {
      localStorage.setItem('creatorToken', nextCreatorToken);
    }
    localStorage.setItem('playerToken', ensurePlayerToken());
  };

  const restoreRoomSession = () => {
    if (userWantsLandingRef.current) return;

    const savedRoomId = localStorage.getItem('roomId');
    const savedUserName = localStorage.getItem('userName');
    const savedCreatorToken = localStorage.getItem('creatorToken') || '';
    const currentPlayerToken = ensurePlayerToken();

    if (!savedRoomId || !savedUserName) return;

    const sessionKey = `${savedRoomId}|${savedUserName}|${savedCreatorToken}|${currentPlayerToken}`;
    const guardKey = `${savedRoomId}|${savedUserName}|${currentPlayerToken}`;
    if (
      (sessionRestoreKeyRef.current === sessionKey && reconnectLockRef.current) ||
      (rejoinGuardRef.current === guardKey && reconnectLockRef.current)
    ) {
      return;
    }

    reconnectLockRef.current = true;
    rejoinGuardRef.current = guardKey;
    sessionRestoreKeyRef.current = sessionKey;
    lastKnownRoomRef.current = savedRoomId;

    if (savedRoomId !== roomId) setRoomId(savedRoomId);
    if (savedUserName !== userName) setUserName(savedUserName);
    if (savedCreatorToken !== creatorToken) setCreatorToken(savedCreatorToken);

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit(
      'join_room',
      {
        roomId: savedRoomId,
        userName: savedUserName,
        creatorToken: savedCreatorToken,
        playerToken: currentPlayerToken,
      },
      (room: Room) => {
        const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
        setRoomData({ ...room, players: sortedPlayers });
        setRoomId(savedRoomId);
        setUserName(savedUserName);
        setInRoom(true);
        setIsJoining(false);
        reconnectLockRef.current = false;
        sessionRestoreKeyRef.current = null;
        rejoinGuardRef.current = null;
      },
    );
  };

  useEffect(() => {
    const handleRoomData = (data: Room) => {
      const sortedPlayers = [...data.players].sort((a, b) => b.score - a.score);
      const newOrder = sortedPlayers.map((player) => player.id);
      const movedIds = newOrder.filter((id, index) => {
        const previousIndex = prevOrderRef.current.indexOf(id);
        return previousIndex > -1 && previousIndex > index;
      });

      if (data.id) {
        lastKnownRoomRef.current = data.id;
        updateHistoryClosedState(
          data.id,
          !!data.isClosed,
          sortedPlayers.map((p) => ({ name: p.name, score: p.score })),
        );
      }

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
          const itemIndex = Math.min(
            Math.floor(currentScore / 10) - 1,
            FUNNY_CELEBRATION_ITEMS.length - 1,
          );
          const celebrationItem = FUNNY_CELEBRATION_ITEMS[itemIndex];
          setCelebration({
            show: true,
            score: currentScore,
            title: celebrationItem.title,
            subtitle: celebrationItem.subtitle,
            gifUrl: celebrationItem.gifUrl,
          });
          fireConfetti();
        }
        prevScoreRef.current = currentScore;
      }

      setRoomData({ ...data, players: sortedPlayers });
      prevOrderRef.current = newOrder;
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

      const savedRoomId = localStorage.getItem('roomId');
      const savedUserName = localStorage.getItem('userName');
      if (savedRoomId && savedUserName) {
        const sameRoom = lastKnownRoomRef.current === savedRoomId;
        if (!sameRoom || !inRoom || reconnectLockRef.current === false) {
          restoreRoomSession();
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const savedRoomId = localStorage.getItem('roomId');
        const savedUserName = localStorage.getItem('userName');
        if (savedRoomId && savedUserName) {
          const sameRoom = lastKnownRoomRef.current === savedRoomId;
          if (!sameRoom || !inRoom) {
            restoreRoomSession();
          }
        }
      }
    };

    socket.on('room_data', handleRoomData);
    socket.on('connect', handleConnect);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const refreshTimer = window.setInterval(() => {
      const savedRoomId = localStorage.getItem('roomId');
      const savedUserName = localStorage.getItem('userName');
      if (savedRoomId && savedUserName && (lastKnownRoomRef.current === savedRoomId || !inRoom)) {
        restoreRoomSession();
      }
    }, 10000);

    return () => {
      socket.off('room_data', handleRoomData);
      socket.off('connect', handleConnect);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(refreshTimer);
    };
  }, [inRoom, roomId, userName, creatorToken]);

  useEffect(() => {
    const storedRoomId = localStorage.getItem('roomId');
    const storedUserName = localStorage.getItem('userName');
    if (!storedRoomId || !storedUserName) return;

    setRoomId(storedRoomId);
    setUserName(storedUserName);
    setCreatorToken(localStorage.getItem('creatorToken') || '');
    setIsJoining(true);
    lastKnownRoomRef.current = storedRoomId;
    restoreRoomSession();
  }, []);

  useEffect(() => {
    if (inRoom || roomHistory.length === 0) return;

    const fetchSummary = () => {
      const roomIds = roomHistory.map((h) => h.roomId);
      socket.emit('get_rooms_summary', roomIds, (summary: Record<string, RoomSummary>) => {
        if (summary) {
          setRoomsSummaryMap(summary);
        }
      });
    };

    fetchSummary();
    const interval = window.setInterval(fetchSummary, 5000);
    return () => window.clearInterval(interval);
  }, [inRoom, roomHistory]);

  useEffect(() => {
    if (!movedPlayerIds.length) return;
    const timeout = window.setTimeout(() => setMovedPlayerIds([]), 900);
    return () => window.clearTimeout(timeout);
  }, [movedPlayerIds]);

  const createRoom = () => {
    if (!userName.trim()) {
      setMessage('Introduce tu nombre para continuar.');
      return;
    }

    userWantsLandingRef.current = false;
    const generatedId = Math.floor(1000 + Math.random() * 9000).toString();
    const generatedToken = creatorToken || generateCreatorToken();
    const activePlayerToken = ensurePlayerToken();
    setCreatorToken(generatedToken);
    setRoomId(generatedId);
    setMessage('');
    persistRoomSession(generatedId, userName, generatedToken);
    addToHistory(generatedId, userName, generatedToken);
    setIsJoining(true);
    setShowRoomCreatedModal(true);
    setActiveTab('room');
    socket.emit(
      'join_room',
      { roomId: generatedId, userName, creatorToken: generatedToken, playerToken: activePlayerToken },
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

    userWantsLandingRef.current = false;
    const activePlayerToken = ensurePlayerToken();
    setMessage('');
    persistRoomSession(normalizedRoomId, userName, creatorToken);
    addToHistory(normalizedRoomId, userName, creatorToken);
    setIsJoining(true);
    setActiveTab('room');
    socket.emit(
      'join_room',
      { roomId: normalizedRoomId, userName, creatorToken, playerToken: activePlayerToken },
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

  const rejoinFromHistory = (item: RoomHistoryItem) => {
    userWantsLandingRef.current = false;
    const targetName = userName.trim() || item.userName;
    setUserName(targetName);
    setRoomId(item.roomId);
    if (item.creatorToken) {
      setCreatorToken(item.creatorToken);
    }
    const activePlayerToken = ensurePlayerToken();
    setMessage('');
    persistRoomSession(item.roomId, targetName, item.creatorToken || creatorToken);
    addToHistory(item.roomId, targetName, item.creatorToken || creatorToken);
    setIsJoining(true);
    setActiveTab('room');
    socket.emit(
      'join_room',
      {
        roomId: item.roomId,
        userName: targetName,
        creatorToken: item.creatorToken || creatorToken,
        playerToken: activePlayerToken,
      },
      (room: Room) => {
        const isClosed = room.isClosed || !!item.isClosed;
        let playersToUse = room.players;
        if (isClosed && item.finalPlayers && item.finalPlayers.length > 0) {
          const scoreMap = new Map<string, number>();
          for (const fp of item.finalPlayers) {
            scoreMap.set(fp.name.trim().toLowerCase(), fp.score);
          }
          playersToUse = room.players.map((p) => {
            const savedScore = scoreMap.get(p.name.trim().toLowerCase());
            return savedScore !== undefined ? { ...p, score: Math.max(p.score, savedScore) } : p;
          });
          for (const fp of item.finalPlayers) {
            if (
              !playersToUse.some(
                (p) => p.name.trim().toLowerCase() === fp.name.trim().toLowerCase(),
              )
            ) {
              playersToUse.push({ id: `saved-${fp.name}`, name: fp.name, score: fp.score });
            }
          }
        }
        const sortedPlayers = [...playersToUse].sort((a, b) => b.score - a.score);
        setRoomData({ ...room, isClosed, players: sortedPlayers });
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
        updateHistoryClosedState(
          room.id,
          true,
          sortedPlayers.map((p) => ({ name: p.name, score: p.score })),
        );
        setRoomData({ ...room, players: sortedPlayers });
        setShowPodium(true);
      }
    });
  };

  const goBackToLanding = () => {
    userWantsLandingRef.current = true;
    setInRoom(false);
  };

  const renderMainContent = () => {
    if (activeTab === 'history') {
      return (
        <HistoryView
          roomHistory={roomHistory}
          roomsSummaryMap={roomsSummaryMap}
          onRejoinFromHistory={rejoinFromHistory}
          onRemoveFromHistory={removeFromHistory}
        />
      );
    }

    if (activeTab === 'reviews') {
      return <ReviewsView userName={userName} />;
    }

    if (activeTab === 'profile') {
      return (
        <ProfileView
          userName={userName}
          onUserNameChange={setUserName}
          onSignedOut={() => {
            setAuthToken('');
            setInRoom(false);
            setActiveTab('room');
          }}
        />
      );
    }

    if (!inRoom) {
      return (
        <LandingView
          userName={userName}
          roomId={roomId}
          message={message}
          roomHistory={roomHistory}
          roomsSummaryMap={roomsSummaryMap}
          onRoomIdChange={setRoomId}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          onRejoinFromHistory={rejoinFromHistory}
          onRemoveFromHistory={removeFromHistory}
        />
      );
    }

    return (
      <RoomView
        roomId={roomId}
        roomData={roomData}
        playerId={playerId}
        socketId={socket.id}
        userName={userName}
        movedPlayerIds={movedPlayerIds}
        floatingSushi={floatingSushi}
        onBack={goBackToLanding}
        onUpdateScore={updateScore}
        onFinishCount={finishCount}
      />
    );
  };

  if (!authToken) {
    return (
      <div className="mobile-app-frame">
        <AuthView
          onAuthenticated={(session) => {
            setAuthToken(session.token);
            setUserName(session.displayName);
          }}
        />
      </div>
    );
  }

  return (
    <div className="mobile-app-frame">
      <div className="mobile-app-content">{renderMainContent()}</div>

      <BottomNav activeTab={activeTab} inRoom={inRoom} onSelectTab={setActiveTab} />

      {showRoomCreatedModal && (
        <RoomCreatedModal roomId={roomId} onClose={() => setShowRoomCreatedModal(false)} />
      )}

      {showPodium && roomData && (
        <PodiumModal roomData={roomData} onClose={() => setShowPodium(false)} />
      )}

      {celebration && celebration.show && (
        <CelebrationOverlay celebration={celebration} onClose={() => setCelebration(null)} />
      )}
    </div>
  );
}

export default App;
