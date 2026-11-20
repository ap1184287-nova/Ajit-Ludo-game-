import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { ProfileDashboardModal } from './components/ProfileDashboardModal';
import { RewardsModal } from './components/RewardsModal';
import { SecretPinModal } from './components/SecretPinModal';
import { SettingsModal } from './components/SettingsModal';
import { QuickModePreset, TitleOverlay } from './components/TitleOverlay';
import { TutorialModal } from './components/TutorialModal';
import { VictoryModal } from './components/VictoryModal';
import { COLOR_HEX, COLOR_LABELS } from './game/boardCoords';
import {
  applySquadToSeats,
  createPlayerProfile,
  deletePlayerProfile,
  loadProfileStore,
  recordMatchOutcomeForProfiles,
  saveProfileStore,
  toggleProfileInSquad,
  updatePlayerProfile,
} from './game/playerProfiles';
import {
  ALL_AVATARS,
  claimDailyReward,
  DEFAULT_COLOR_AVATAR,
  loadProgression,
  saveProgression,
} from './game/progression';
import {
  applyDiceRoll,
  chooseAIMove,
  createDefaultSetup,
  createInitialMatch,
  executeTokenMove,
  getCurrentPlayerColor,
} from './game/rules';
import {
  SecretModeState,
  consumeNextDiceValue,
  createInitialSecretModeState,
  deactivateSecretMode,
  selectSecretDiceValue,
  toggleSecretPadVisibility,
  unlockSecretMode,
} from './game/secretHackMode';
import { soundEngine } from './game/soundEngine';
import {
  AIDifficulty,
  AvatarId,
  CameraPreset,
  GamePhase,
  GameSettings,
  MatchState,
  PlayerColor,
  PlayerCount,
  PlayerProfileStore,
  PlayerProgression,
  PlayerSeatSetup,
} from './game/types';
import { LudoSceneManager } from './three/LudoSceneManager';

const SETTINGS_STORAGE_KEY = 'ludo_mod_settings_v1';

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  hapticsEnabled: true,
  speed: 'normal',
  cameraPreset: 'classic',
  aiDifficulty: 'normal',
  autoMoveSingle: true,
  threeSixesForfeit: true,
};

function loadInitialSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GameSettings> & {
      aiDifficulty?: string;
      cameraPreset?: string;
    };
    const rawDiff = parsed.aiDifficulty;
    const normalizedDiff: AIDifficulty =
      rawDiff === 'easy' || rawDiff === 'normal' || rawDiff === 'hard'
        ? rawDiff
        : rawDiff === 'casual'
          ? 'easy'
          : rawDiff === 'tactical'
            ? 'hard'
            : DEFAULT_SETTINGS.aiDifficulty;

    const normalizedCam: CameraPreset =
      parsed.cameraPreset === 'top' ? 'top' : 'classic';

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      aiDifficulty: normalizedDiff,
      cameraPreset: normalizedCam,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function syncSeatsWithProfileSquad(
  prevSeats: readonly PlayerSeatSetup[],
  count: PlayerCount,
  store: PlayerProfileStore,
  forceAllHuman = false,
): PlayerSeatSetup[] {
  const defaults = createDefaultSetup(count);
  const base = defaults.map((def, idx) => {
    const existing = prevSeats.find((p) => p.color === def.color);
    const control: 'human' | 'ai' = forceAllHuman
      ? 'human'
      : existing && !existing.profileId
        ? existing.control
        : def.control;
    return {
      ...def,
      control,
      avatarId:
        existing && !existing.profileId
          ? existing.avatarId ?? def.avatarId
          : def.avatarId,
      name:
        control === 'human'
          ? idx === 0
            ? 'You'
            : `${COLOR_LABELS[def.color]} P${idx + 1}`
          : `${COLOR_LABELS[def.color]} AI`,
    };
  });
  return applySquadToSeats(base, store);
}

export default function App() {
  const autostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [settings, setSettings] = useState<GameSettings>(loadInitialSettings);
  const [progression, setProgression] = useState<PlayerProgression>(
    loadProgression,
  );
  const [profileState, setProfileState] = useState(() => loadProfileStore());
  const [entryFee, setEntryFee] = useState<number>(() =>
    loadProgression().coins >= 100 ? 100 : 0,
  );
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(false);
  const [rewardsOpen, setRewardsOpen] = useState<boolean>(false);
  const [tutorialOpen, setTutorialOpen] = useState<boolean>(false);
  const [profilesOpen, setProfilesOpen] = useState<boolean>(false);
  const [secretPinOpen, setSecretPinOpen] = useState<boolean>(false);
  const [secretMode, setSecretMode] = useState<SecretModeState>(
    createInitialSecretModeState,
  );
  const [lastClaimedAmount, setLastClaimedAmount] = useState<number | null>(
    null,
  );
  const [coinsEarnedOnWin, setCoinsEarnedOnWin] = useState<number>(0);

  const [playerCount, setPlayerCount] = useState<PlayerCount>(4);
  const [seats, setSeats] = useState<PlayerSeatSetup[]>(() => {
    const prog = loadProgression();
    const { store } = loadProfileStore();
    const initial = createDefaultSetup(4);
    initial[0] = { ...initial[0], avatarId: prog.playerAvatar };
    return applySquadToSeats(initial, store);
  });
  const [phase, setPhase] = useState<GamePhase>(
    autostart ? 'playing' : 'title',
  );
  const [settingsReturnPhase, setSettingsReturnPhase] = useState<
    'title' | 'playing'
  >('playing');
  const [match, setMatch] = useState<MatchState>(() =>
    createInitialMatch(createDefaultSetup(4), Date.now(), 0, false),
  );
  const [cutBanner, setCutBanner] = useState<{
    attacker: string;
    victim: string;
    color: PlayerColor;
    key: number;
  } | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<LudoSceneManager | null>(null);
  const matchRef = useRef<MatchState>(match);
  const phaseRef = useRef<GamePhase>(phase);
  const settingsRef = useRef<GameSettings>(settings);
  const progressionRef = useRef<PlayerProgression>(progression);
  const profileStoreRef = useRef<PlayerProfileStore>(profileState.store);
  const playerCountRef = useRef<PlayerCount>(playerCount);
  const rewardsOpenRef = useRef<boolean>(rewardsOpen);
  const tutorialOpenRef = useRef<boolean>(tutorialOpen);
  const profilesOpenRef = useRef<boolean>(profilesOpen);
  const secretPinOpenRef = useRef<boolean>(secretPinOpen);
  const secretModeRef = useRef<SecretModeState>(secretMode);
  const settingsReturnPhaseRef = useRef<'title' | 'playing'>(
    settingsReturnPhase,
  );
  const epochRef = useRef<number>(1);
  const aiTimerRef = useRef<number | null>(null);
  const cutBannerTimerRef = useRef<number | null>(null);
  const isRollingRef = useRef<boolean>(false);
  const isMovingRef = useRef<boolean>(false);

  matchRef.current = match;
  phaseRef.current = phase;
  settingsRef.current = settings;
  progressionRef.current = progression;
  profileStoreRef.current = profileState.store;
  playerCountRef.current = playerCount;
  rewardsOpenRef.current = rewardsOpen;
  tutorialOpenRef.current = tutorialOpen;
  profilesOpenRef.current = profilesOpen;
  secretPinOpenRef.current = secretPinOpen;
  secretModeRef.current = secretMode;
  settingsReturnPhaseRef.current = settingsReturnPhase;

  // Sync audio, music & haptics settings
  useEffect(() => {
    soundEngine.setEnabled(settings.soundEnabled);
    soundEngine.setMusicEnabled(settings.musicEnabled);
    soundEngine.setHapticsEnabled(settings.hapticsEnabled);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage quota errors in restricted webviews
    }
  }, [settings]);

  // Unlock Web Audio & start gentle royal background music on first user gesture
  useEffect(() => {
    const unlock = () => {
      soundEngine.unlockAndStartMusic();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Mirror game state machine to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = phase;
  }, [phase]);

  const clearScheduledTimers = useCallback(() => {
    if (aiTimerRef.current !== null) {
      window.clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    if (cutBannerTimerRef.current !== null) {
      window.clearTimeout(cutBannerTimerRef.current);
      cutBannerTimerRef.current = null;
    }
  }, []);

  const executeMoveForToken = useCallback((tokenId: string) => {
    const current = matchRef.current;
    const epoch = epochRef.current;
    if (
      isMovingRef.current ||
      isRollingRef.current ||
      phaseRef.current !== 'playing' ||
      current.turnPhase !== 'await_move'
    ) {
      return;
    }
    if (!current.legalTokenIds.includes(tokenId)) return;

    const movingToken = current.tokens.find((t) => t.id === tokenId);
    if (!movingToken) return;

    // Lock synchronously to prevent duplicate move triggers on double-taps
    isMovingRef.current = true;
    const wasInYard = movingToken.progress === -1;
    const moveRes = executeTokenMove(current, tokenId);
    const speed = settingsRef.current.speed;

    const animatingState: MatchState = {
      ...current,
      turnPhase: 'animating_move',
      legalTokenIds: [],
      statusMessage: `${current.players[movingToken.color].name} moving…`,
    };
    matchRef.current = animatingState;
    setMatch(animatingState);

    sceneRef.current?.setSelectableTokens([], movingToken.color, false);

    if (wasInYard) {
      soundEngine.playTokenDeploy();
    }

    const onMoveAnimDone = () => {
      if (epochRef.current !== epoch) return;
      isMovingRef.current = false;

      if (moveRes.capturedTokens.length > 0) {
        const cutEventKey = `${current.turnNumber}-${tokenId}-${moveRes.capturedTokens.map((c) => c.id).join(',')}`;
        soundEngine.playCapture(cutEventKey);
        sceneRef.current?.animateCapturedTokens(
          moveRes.capturedTokens,
          moveRes.nextState.tokens,
          speed,
          tokenId,
        );

        const firstVictim = moveRes.capturedTokens[0];
        const attackerName = current.players[movingToken.color].name;
        const victimName = current.players[firstVictim.color].name;
        if (cutBannerTimerRef.current !== null) {
          window.clearTimeout(cutBannerTimerRef.current);
        }
        setCutBanner({
          attacker: attackerName,
          victim: victimName,
          color: movingToken.color,
          key: Date.now(),
        });
        cutBannerTimerRef.current = window.setTimeout(() => {
          setCutBanner(null);
          cutBannerTimerRef.current = null;
        }, 1600);
      } else {
        sceneRef.current?.syncTokens(moveRes.nextState.tokens);
      }

      if (moveRes.reachedHome) {
        soundEngine.playHomeGoal();
        sceneRef.current?.spawnBurst(
          0,
          0.5,
          0,
          COLOR_HEX[movingToken.color],
          26,
        );
      }

      if (moveRes.winner) {
        soundEngine.playVictoryFanfare();
        sceneRef.current?.triggerVictoryCelebration();
        const finalState: MatchState = {
          ...moveRes.nextState,
          elapsedMs: Date.now() - moveRes.nextState.startedAtMs,
        };

        const humanWon =
          finalState.players[moveRes.winner].control === 'human';
        const earned = humanWon
          ? finalState.prizePool > 0
            ? finalState.prizePool
            : 150
          : 50;

        setCoinsEarnedOnWin(earned);
        setProgression((prev) => {
          const nextProg: PlayerProgression = {
            ...prev,
            coins: prev.coins + earned,
            matchesPlayed: prev.matchesPlayed + 1,
            matchesWon: prev.matchesWon + (humanWon ? 1 : 0),
          };
          saveProgression(nextProg);
          return nextProg;
        });

        const updatedStore = recordMatchOutcomeForProfiles(
          profileStoreRef.current,
          finalState,
        );
        if (updatedStore !== profileStoreRef.current) {
          profileStoreRef.current = updatedStore;
          saveProfileStore(updatedStore);
          setProfileState((prev) => ({ ...prev, store: updatedStore }));
        }

        matchRef.current = finalState;
        setMatch(finalState);
        phaseRef.current = 'gameover';
        setPhase('gameover');
        return;
      }

      matchRef.current = moveRes.nextState;
      setMatch(moveRes.nextState);
      const nextColor = getCurrentPlayerColor(moveRes.nextState);
      sceneRef.current?.setGameStateView(
        false,
        settingsRef.current.cameraPreset,
        nextColor,
      );
    };

    if (sceneRef.current) {
      sceneRef.current.animateTokenHop(
        tokenId,
        movingToken.color,
        movingToken.index,
        moveRes.pathProgresses,
        moveRes.nextState.tokens,
        speed,
        (stepIdx) => {
          if (epochRef.current !== epoch) return;
          if (!wasInYard) {
            soundEngine.playTokenHop(stepIdx);
          }
        },
        onMoveAnimDone,
        wasInYard,
      );
    } else {
      onMoveAnimDone();
    }
  }, []);

  const performDiceRoll = useCallback(
    (isAutomated = false) => {
      const current = matchRef.current;
      const epoch = epochRef.current;
      if (
        isRollingRef.current ||
        isMovingRef.current ||
        phaseRef.current !== 'playing' ||
        current.turnPhase !== 'await_roll'
      ) {
        return;
      }

      const activeColor = getCurrentPlayerColor(current);
      const activePlayer = current.players[activeColor];
      if (!isAutomated && activePlayer.control !== 'human') {
        return;
      }

      // Synchronous roll lock — strictly prevents multiple rolls during an active roll
      isRollingRef.current = true;
      soundEngine.unlockAndStartMusic();

      const dicePick = consumeNextDiceValue(secretModeRef.current, isAutomated);
      const rolledValue = dicePick.rolledValue;
      if (dicePick.nextState !== secretModeRef.current) {
        secretModeRef.current = dicePick.nextState;
        setSecretMode(dicePick.nextState);
      }
      const speed = settingsRef.current.speed;

      soundEngine.playDiceRoll();
      const rollingState: MatchState = {
        ...current,
        turnPhase: 'rolling',
        statusMessage: `${activePlayer.name} rolling…`,
      };
      matchRef.current = rollingState;
      setMatch(rollingState);
      sceneRef.current?.setSelectableTokens([], activeColor, false);

      const onDiceSettled = () => {
        if (epochRef.current !== epoch) return;
        isRollingRef.current = false;
        soundEngine.playDiceLand(rolledValue === 6);

        if (rolledValue === 6) {
          sceneRef.current?.spawnBurst(0, 0.75, 0, '#fbbf24', 18);
        }

        const rolledState = applyDiceRoll(
          matchRef.current,
          rolledValue,
          settingsRef.current.threeSixesForfeit,
        );
        matchRef.current = rolledState;
        setMatch(rolledState);

        const nextColor = getCurrentPlayerColor(rolledState);
        sceneRef.current?.setGameStateView(
          false,
          settingsRef.current.cameraPreset,
          nextColor,
        );

        // If human has only 1 legal move and autoMoveSingle is enabled
        if (
          rolledState.turnPhase === 'await_move' &&
          rolledState.players[nextColor].control === 'human' &&
          rolledState.legalTokenIds.length === 1 &&
          settingsRef.current.autoMoveSingle
        ) {
          const singleId = rolledState.legalTokenIds[0];
          aiTimerRef.current = window.setTimeout(
            () => {
              if (epochRef.current === epoch && phaseRef.current === 'playing') {
                executeMoveForToken(singleId);
              }
            },
            speed === 'fast' ? 140 : 240,
          );
        }
      };

      if (sceneRef.current) {
        sceneRef.current.animateDiceRoll(rolledValue, speed, onDiceSettled);
      } else {
        onDiceSettled();
      }
    },
    [executeMoveForToken],
  );

  // Keep latest scene click handlers in refs so Three.js mounts once
  const sceneHandlersRef = useRef({
    onDieClick: () => performDiceRoll(false),
    onTokenClick: (tokenId: string) => executeMoveForToken(tokenId),
  });
  sceneHandlersRef.current = {
    onDieClick: () => performDiceRoll(false),
    onTokenClick: (tokenId: string) => executeMoveForToken(tokenId),
  };

  // Mount Three.js WebGLRenderer once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    try {
      const manager = new LudoSceneManager(mount, {
        onDieClick: () => sceneHandlersRef.current.onDieClick(),
        onTokenClick: (id) => sceneHandlersRef.current.onTokenClick(id),
      });
      sceneRef.current = manager;
      manager.syncTokens(matchRef.current.tokens, true);
      manager.setGameStateView(
        phaseRef.current === 'title',
        settingsRef.current.cameraPreset,
        getCurrentPlayerColor(matchRef.current),
      );

      return () => {
        manager.dispose();
        sceneRef.current = null;
      };
    } catch (err) {
      setWebglError(
        err instanceof Error ? err.message : 'Unable to initialize 3D WebGL',
      );
    }
  }, []);

  // Sync scene highlights & fixed camera view when match/phase/settings change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const activeColor = getCurrentPlayerColor(match);
    const activePlayer = match.players[activeColor];
    const isHuman = activePlayer.control === 'human';

    scene.setGameStateView(
      phase === 'title',
      settings.cameraPreset,
      activeColor,
    );

    if (phase === 'playing' && isHuman && match.turnPhase === 'await_move') {
      scene.setSelectableTokens(match.legalTokenIds, activeColor, false);
    } else if (
      phase === 'playing' &&
      isHuman &&
      match.turnPhase === 'await_roll'
    ) {
      scene.setSelectableTokens([], activeColor, true);
    } else {
      scene.setSelectableTokens([], activeColor, false);
    }
  }, [match, phase, settings.cameraPreset]);

  // Computer AI turn scheduler
  useEffect(() => {
    if (phase !== 'playing') {
      clearScheduledTimers();
      return;
    }

    const activeColor = getCurrentPlayerColor(match);
    const activePlayer = match.players[activeColor];
    if (activePlayer.control !== 'ai') return;

    const epoch = epochRef.current;
    const fast = settings.speed === 'fast';
    const effectiveDifficulty: AIDifficulty = match.isPractice
      ? 'easy'
      : settings.aiDifficulty;

    if (match.turnPhase === 'await_roll') {
      clearScheduledTimers();
      aiTimerRef.current = window.setTimeout(
        () => {
          if (epochRef.current === epoch && phaseRef.current === 'playing') {
            performDiceRoll(true);
          }
        },
        fast ? 240 : 480,
      );
    } else if (match.turnPhase === 'await_move' && match.diceValue !== null) {
      clearScheduledTimers();
      const chosenId = chooseAIMove(
        match,
        activeColor,
        match.diceValue,
        effectiveDifficulty,
      );
      if (chosenId) {
        aiTimerRef.current = window.setTimeout(
          () => {
            if (epochRef.current === epoch && phaseRef.current === 'playing') {
              executeMoveForToken(chosenId);
            }
          },
          fast ? 200 : 400,
        );
      }
    }

    return () => {
      clearScheduledTimers();
    };
  }, [
    phase,
    match,
    settings.speed,
    settings.aiDifficulty,
    clearScheduledTimers,
    performDiceRoll,
    executeMoveForToken,
  ]);

  const handleSelectPlayerCount = useCallback((count: PlayerCount) => {
    soundEngine.playUiClick();
    setIsPracticeMode(false);
    setPlayerCount(count);
    setSeats((prev) =>
      syncSeatsWithProfileSquad(prev, count, profileStoreRef.current),
    );
  }, []);

  const handleSelectQuickMode = useCallback((mode: QuickModePreset) => {
    soundEngine.playUiClick();
    const store = profileStoreRef.current;
    if (mode === 'practice') {
      setIsPracticeMode(true);
      setPlayerCount(2);
      setEntryFee(0);
      const next = createDefaultSetup(2);
      const primary = store.profiles.find(
        (p) => p.id === store.activeSquadProfileIds[0],
      );
      next[0] = primary
        ? {
            ...next[0],
            name: primary.name,
            avatarId: primary.avatarId,
            profileId: primary.id,
            playerId: primary.playerId,
          }
        : { ...next[0], avatarId: progressionRef.current.playerAvatar };
      next[1] = { ...next[1], name: 'Practice Bot' };
      setSeats(next);
      setSettings((prev) => ({ ...prev, aiDifficulty: 'easy' }));
      return;
    }

    setIsPracticeMode(false);
    if (mode === 'vs-ai') {
      setPlayerCount(4);
      setSeats(syncSeatsWithProfileSquad(createDefaultSetup(4), 4, store));
    } else if (mode === 'pass-play') {
      setPlayerCount(4);
      setSeats(syncSeatsWithProfileSquad(createDefaultSetup(4), 4, store, true));
    } else {
      setPlayerCount(2);
      setSeats(syncSeatsWithProfileSquad(createDefaultSetup(2), 2, store));
    }
  }, []);

  const handleToggleSeatControl = useCallback((idx: number) => {
    soundEngine.playUiClick();
    setIsPracticeMode(false);
    setSeats((prev) =>
      prev.map((seat, i) => {
        if (i !== idx) return seat;
        const nextControl = seat.control === 'human' ? 'ai' : 'human';
        return {
          ...seat,
          control: nextControl,
          profileId: nextControl === 'ai' ? undefined : seat.profileId,
          playerId: nextControl === 'ai' ? undefined : seat.playerId,
          name:
            nextControl === 'human'
              ? idx === 0
                ? 'You'
                : `${COLOR_LABELS[seat.color]} P${idx + 1}`
              : `${COLOR_LABELS[seat.color]} AI`,
        };
      }),
    );
  }, []);

  const handleCycleSeatAvatar = useCallback((idx: number) => {
    soundEngine.playUiClick();
    setSeats((prev) =>
      prev.map((seat, i) => {
        if (i !== idx) return seat;
        const currentAvatar = seat.avatarId ?? DEFAULT_COLOR_AVATAR[seat.color];
        const curPos = ALL_AVATARS.findIndex((a) => a.id === currentAvatar);
        const nextAvatar = ALL_AVATARS[(curPos + 1) % ALL_AVATARS.length].id;
        if (i === 0) {
          setProgression((p) => {
            const updated = { ...p, playerAvatar: nextAvatar };
            saveProgression(updated);
            return updated;
          });
        }
        return { ...seat, avatarId: nextAvatar };
      }),
    );
  }, []);

  const applyStoreMutation = useCallback((nextStore: PlayerProfileStore) => {
    profileStoreRef.current = nextStore;
    saveProfileStore(nextStore);
    setProfileState({ store: nextStore, tamperDetected: false });
    if (phaseRef.current === 'title') {
      const targetCount = Math.max(
        playerCountRef.current,
        Math.min(4, Math.max(2, nextStore.activeSquadProfileIds.length)),
      ) as PlayerCount;
      setPlayerCount(targetCount);
      setSeats((prev) => syncSeatsWithProfileSquad(prev, targetCount, nextStore));
    }
  }, []);

  const handleCreateProfile = useCallback(
    (input: { name: string; age: number; avatarId: AvatarId; pin?: string }) => {
      soundEngine.playUiClick();
      const res = createPlayerProfile(profileStoreRef.current, input);
      if (res.ok) {
        applyStoreMutation(res.store);
      }
      return { ok: res.ok, error: res.error };
    },
    [applyStoreMutation],
  );

  const handleUpdateProfile = useCallback(
    (
      profileId: string,
      input: { name: string; age: number; avatarId: AvatarId; pin?: string },
      authPin?: string,
      clearPin?: boolean,
    ) => {
      soundEngine.playUiClick();
      const res = updatePlayerProfile(
        profileStoreRef.current,
        profileId,
        input,
        authPin,
        Date.now(),
        Boolean(clearPin),
      );
      if (res.ok) {
        applyStoreMutation(res.store);
      }
      return { ok: res.ok, error: res.error };
    },
    [applyStoreMutation],
  );

  const handleDeleteProfile = useCallback(
    (profileId: string, authPin?: string) => {
      soundEngine.playUiClick();
      const activeIds =
        phaseRef.current !== 'title'
          ? matchRef.current.activeColors
              .map((c) => matchRef.current.players[c].profileId)
              .filter((id): id is string => Boolean(id))
          : [];
      const res = deletePlayerProfile(
        profileStoreRef.current,
        profileId,
        authPin,
        activeIds,
      );
      if (res.ok) {
        applyStoreMutation(res.store);
      }
      return { ok: res.ok, error: res.error };
    },
    [applyStoreMutation],
  );

  const handleToggleSquadProfile = useCallback(
    (profileId: string) => {
      soundEngine.playUiClick();
      const res = toggleProfileInSquad(profileStoreRef.current, profileId);
      if (res.ok) {
        applyStoreMutation(res.store);
      }
      return { ok: res.ok, error: res.error };
    },
    [applyStoreMutation],
  );

  const handleApplySquadAndClose = useCallback(() => {
    soundEngine.playUiClick();
    const store = profileStoreRef.current;
    const squadLen = store.activeSquadProfileIds.length;
    const nextCount = Math.max(
      playerCountRef.current,
      Math.min(4, Math.max(2, squadLen)),
    ) as PlayerCount;
    setPlayerCount(nextCount);
    setSeats((prev) => syncSeatsWithProfileSquad(prev, nextCount, store));
    setProfilesOpen(false);
  }, []);

  const handleClaimDaily = useCallback(() => {
    const { updated, reward } = claimDailyReward(progressionRef.current);
    if (reward > 0) {
      soundEngine.playCoinReward();
      setProgression(updated);
      setLastClaimedAmount(reward);
    }
  }, []);

  const handleBonusRefill = useCallback(() => {
    soundEngine.playCoinReward();
    setProgression((prev) => {
      const updated = { ...prev, coins: prev.coins + 500 };
      saveProgression(updated);
      return updated;
    });
    setLastClaimedAmount(500);
  }, []);

  const launchMatch = useCallback(
    (
      targetSeats: PlayerSeatSetup[],
      fee: number,
      practice: boolean,
    ) => {
      soundEngine.unlockAndStartMusic();
      soundEngine.playUiClick();
      clearScheduledTimers();
      isRollingRef.current = false;
      isMovingRef.current = false;
      setCutBanner(null);
      epochRef.current += 1;

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      const effectiveFee =
        practice ? 0 : progressionRef.current.coins >= fee ? fee : 0;
      if (effectiveFee > 0) {
        setProgression((prev) => {
          const updated = {
            ...prev,
            coins: Math.max(0, prev.coins - effectiveFee),
          };
          saveProgression(updated);
          return updated;
        });
      }

      setCoinsEarnedOnWin(0);
      const fresh = createInitialMatch(
        targetSeats,
        Date.now(),
        effectiveFee,
        practice,
      );
      matchRef.current = fresh;
      setMatch(fresh);
      phaseRef.current = 'playing';
      setPhase('playing');
      sceneRef.current?.syncTokens(fresh.tokens, true);
      sceneRef.current?.setGameStateView(
        false,
        settingsRef.current.cameraPreset,
        getCurrentPlayerColor(fresh),
      );
    },
    [clearScheduledTimers],
  );

  const handleStartMatch = useCallback(() => {
    launchMatch(seats, entryFee, isPracticeMode);
  }, [launchMatch, seats, entryFee, isPracticeMode]);

  const handleStartPractice = useCallback(() => {
    const store = profileStoreRef.current;
    const primary = store.profiles.find(
      (p) => p.id === store.activeSquadProfileIds[0],
    );
    const practiceSeats = createDefaultSetup(2);
    practiceSeats[0] = primary
      ? {
          ...practiceSeats[0],
          name: primary.name,
          avatarId: primary.avatarId,
          profileId: primary.id,
          playerId: primary.playerId,
        }
      : {
          ...practiceSeats[0],
          avatarId: progressionRef.current.playerAvatar,
        };
    practiceSeats[1] = { ...practiceSeats[1], name: 'Practice Bot' };
    setIsPracticeMode(true);
    setPlayerCount(2);
    setEntryFee(0);
    setSeats(practiceSeats);
    setTutorialOpen(false);
    launchMatch(practiceSeats, 0, true);
  }, [launchMatch]);

  const handleRestartMatch = useCallback(() => {
    launchMatch(seats, entryFee, matchRef.current.isPractice);
  }, [launchMatch, seats, entryFee]);

  const handleExitToTitle = useCallback(() => {
    soundEngine.playUiClick();
    clearScheduledTimers();
    isRollingRef.current = false;
    isMovingRef.current = false;
    setCutBanner(null);
    epochRef.current += 1;

    const preview = createInitialMatch(seats, Date.now(), 0, false);
    matchRef.current = preview;
    setMatch(preview);
    phaseRef.current = 'title';
    setPhase('title');
    sceneRef.current?.syncTokens(preview.tokens, true);
    sceneRef.current?.setGameStateView(
      true,
      settingsRef.current.cameraPreset,
      getCurrentPlayerColor(preview),
    );
  }, [seats, clearScheduledTimers]);

  const handleCycleCamera = useCallback(() => {
    soundEngine.playUiClick();
    setSettings((prev) => {
      const next: CameraPreset =
        prev.cameraPreset === 'classic' ? 'top' : 'classic';
      sceneRef.current?.applyCameraPreset(
        next,
        getCurrentPlayerColor(matchRef.current),
      );
      return { ...prev, cameraPreset: next };
    });
  }, []);

  const handleToggleSound = useCallback(() => {
    setSettings((prev) => {
      const nextSound = !prev.soundEnabled;
      soundEngine.setEnabled(nextSound);
      if (nextSound) soundEngine.playUiClick();
      return { ...prev, soundEnabled: nextSound };
    });
  }, []);

  const handleToggleMusic = useCallback(() => {
    soundEngine.unlockAndStartMusic();
    setSettings((prev) => {
      const nextMusic = !prev.musicEnabled;
      soundEngine.setMusicEnabled(nextMusic);
      soundEngine.playUiClick();
      return { ...prev, musicEnabled: nextMusic };
    });
  }, []);

  const handleUpdateSettings = useCallback((partial: Partial<GameSettings>) => {
    soundEngine.playUiClick();
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleUnlockSecretPinAttempt = useCallback((pin: string) => {
    soundEngine.playUiClick();
    const res = unlockSecretMode(secretModeRef.current, pin);
    if (!res.ok) {
      return { ok: false, error: res.error };
    }
    secretModeRef.current = res.state;
    setSecretMode(res.state);
    setSecretPinOpen(false);
    if (
      phaseRef.current === 'paused' &&
      settingsReturnPhaseRef.current === 'playing'
    ) {
      phaseRef.current = 'playing';
      setPhase('playing');
    }
    return { ok: true };
  }, []);

  const handleDisableSecretMode = useCallback(() => {
    soundEngine.playUiClick();
    const next = deactivateSecretMode();
    secretModeRef.current = next;
    setSecretMode(next);
  }, []);

  const handleSelectSecretDice = useCallback((value: number) => {
    soundEngine.playUiClick();
    const next = selectSecretDiceValue(secretModeRef.current, value);
    secretModeRef.current = next;
    setSecretMode(next);
  }, []);

  const handleToggleSecretPad = useCallback(() => {
    soundEngine.playUiClick();
    const next = toggleSecretPadVisibility(secretModeRef.current);
    secretModeRef.current = next;
    setSecretMode(next);
  }, []);

  // Keyboard shortcuts: Enter/Space on Title, Space to Roll, Esc/P Pause, M Mute
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (secretPinOpenRef.current) {
        if (e.code === 'Escape') {
          e.preventDefault();
          setSecretPinOpen(false);
        }
        return;
      }

      if (profilesOpenRef.current) {
        if (e.code === 'Escape') {
          e.preventDefault();
          setProfilesOpen(false);
        }
        return;
      }

      if (tutorialOpenRef.current) {
        if (e.code === 'Escape') {
          e.preventDefault();
          setTutorialOpen(false);
        }
        return;
      }

      if (rewardsOpenRef.current) {
        if (e.code === 'Escape') {
          e.preventDefault();
          setRewardsOpen(false);
        }
        return;
      }

      if (phaseRef.current === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartMatch();
        }
        return;
      }

      if (phaseRef.current === 'playing') {
        if (e.code === 'Space') {
          e.preventDefault();
          performDiceRoll(false);
        } else if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          setSettingsReturnPhase('playing');
          setPhase('paused');
        } else if (e.code === 'KeyM') {
          e.preventDefault();
          handleToggleSound();
        }
        return;
      }

      if (phaseRef.current === 'paused') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          setPhase(settingsReturnPhaseRef.current);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleStartMatch, performDiceRoll, handleToggleSound]);

  const primaryProfileObj =
    profileState.store.profiles.find(
      (p) => p.id === profileState.store.activeSquadProfileIds[0],
    ) ??
    profileState.store.profiles[0] ??
    null;

  return (
    <main className="relative w-full h-dvh overflow-hidden bg-[#0b0e24]">
      {/* Fixed WebGL Canvas Mount Container (Board never pans/rotates/scrolls) */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full z-0"
        aria-label="LUDO MOD 3D Game Board"
      />

      {/* Graceful fallback if WebGL is unavailable */}
      {webglError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0b0e24] text-center">
          <div className="max-w-sm rounded-3xl border border-indigo-400/40 bg-[#15173c] p-6">
            <h2 className="text-lg font-bold text-white">3D Renderer Unavailable</h2>
            <p className="text-sm text-slate-300 mt-2">{webglError}</p>
          </div>
        </div>
      )}

      {phase === 'title' && (
        <TitleOverlay
          playerCount={playerCount}
          seats={seats}
          aiDifficulty={settings.aiDifficulty}
          entryFee={entryFee}
          isPracticeMode={isPracticeMode}
          progression={progression}
          soundEnabled={settings.soundEnabled}
          musicEnabled={settings.musicEnabled}
          activeProfileCount={profileState.store.profiles.length}
          squadCount={profileState.store.activeSquadProfileIds.length}
          primaryProfile={
            primaryProfileObj
              ? {
                  name: primaryProfileObj.name,
                  playerId: primaryProfileObj.playerId,
                  avatarId: primaryProfileObj.avatarId,
                  matchesWon: primaryProfileObj.matchesWon,
                }
              : null
          }
          onSelectPlayerCount={handleSelectPlayerCount}
          onSelectQuickMode={handleSelectQuickMode}
          onToggleSeatControl={handleToggleSeatControl}
          onCycleSeatAvatar={handleCycleSeatAvatar}
          onOpenProfiles={() => {
            soundEngine.playUiClick();
            setProfilesOpen(true);
          }}
          onSelectDifficulty={(diff: AIDifficulty) =>
            handleUpdateSettings({ aiDifficulty: diff })
          }
          onSelectEntryFee={(fee: number) => {
            soundEngine.playUiClick();
            setIsPracticeMode(false);
            setEntryFee(fee);
          }}
          onOpenRewards={() => {
            soundEngine.playUiClick();
            setLastClaimedAmount(null);
            setRewardsOpen(true);
          }}
          onOpenTutorial={() => {
            soundEngine.playUiClick();
            setTutorialOpen(true);
          }}
          onToggleSound={handleToggleSound}
          onToggleMusic={handleToggleMusic}
          onOpenSettings={() => {
            soundEngine.playUiClick();
            setSettingsReturnPhase('title');
            setPhase('paused');
          }}
          onStartMatch={handleStartMatch}
          onStartPractice={handleStartPractice}
        />
      )}

      {(phase === 'playing' || (phase === 'paused' && settingsReturnPhase === 'playing')) && (
        <GameHud
          match={match}
          soundEnabled={settings.soundEnabled}
          musicEnabled={settings.musicEnabled}
          cameraPreset={settings.cameraPreset}
          cutBanner={cutBanner}
          secretMode={secretMode}
          onSelectSecretDice={handleSelectSecretDice}
          onToggleSecretPad={handleToggleSecretPad}
          onDisableSecretMode={handleDisableSecretMode}
          onRollDice={() => performDiceRoll(false)}
          onSelectToken={executeMoveForToken}
          onCycleCamera={handleCycleCamera}
          onToggleSound={handleToggleSound}
          onToggleMusic={handleToggleMusic}
          onOpenTutorial={() => {
            soundEngine.playUiClick();
            setTutorialOpen(true);
          }}
          onOpenSettings={() => {
            soundEngine.playUiClick();
            setSettingsReturnPhase('playing');
            setPhase('paused');
          }}
        />
      )}

      {phase === 'paused' && (
        <SettingsModal
          settings={settings}
          inActiveMatch={settingsReturnPhase === 'playing'}
          secretModeUnlocked={secretMode.unlocked}
          onUpdateSettings={handleUpdateSettings}
          onOpenProfiles={() => {
            soundEngine.playUiClick();
            setProfilesOpen(true);
          }}
          onOpenSecretPin={() => {
            soundEngine.playUiClick();
            setSecretPinOpen(true);
          }}
          onDisableSecretMode={handleDisableSecretMode}
          onOpenTutorial={() => {
            soundEngine.playUiClick();
            setTutorialOpen(true);
          }}
          onResume={() => {
            soundEngine.playUiClick();
            setPhase(settingsReturnPhase);
          }}
          onRestart={handleRestartMatch}
          onExitToTitle={handleExitToTitle}
        />
      )}

      {phase === 'gameover' && (
        <VictoryModal
          match={match}
          coinsEarned={coinsEarnedOnWin}
          onPlayAgain={handleRestartMatch}
          onExitToTitle={handleExitToTitle}
        />
      )}

      {rewardsOpen && (
        <RewardsModal
          progression={progression}
          lastClaimedAmount={lastClaimedAmount}
          onClaimDaily={handleClaimDaily}
          onBonusRefill={handleBonusRefill}
          onClose={() => {
            soundEngine.playUiClick();
            setRewardsOpen(false);
          }}
        />
      )}

      {tutorialOpen && (
        <TutorialModal
          onClose={() => {
            soundEngine.playUiClick();
            setTutorialOpen(false);
          }}
          onStartPractice={handleStartPractice}
        />
      )}

      {profilesOpen && (
        <ProfileDashboardModal
          store={profileState.store}
          tamperDetected={profileState.tamperDetected}
          inActiveMatch={
            phase === 'playing' ||
            (phase === 'paused' && settingsReturnPhase === 'playing')
          }
          activeMatchProfileIds={
            phase !== 'title'
              ? match.activeColors
                  .map((c) => match.players[c].profileId)
                  .filter((id): id is string => Boolean(id))
              : []
          }
          onCreateProfile={handleCreateProfile}
          onUpdateProfile={handleUpdateProfile}
          onDeleteProfile={handleDeleteProfile}
          onToggleSquadProfile={handleToggleSquadProfile}
          onApplyAndPlay={
            phase === 'title' ? handleApplySquadAndClose : undefined
          }
          onClose={() => {
            soundEngine.playUiClick();
            setProfilesOpen(false);
          }}
        />
      )}

      {secretPinOpen && (
        <SecretPinModal
          onUnlockAttempt={handleUnlockSecretPinAttempt}
          onClose={() => {
            soundEngine.playUiClick();
            setSecretPinOpen(false);
          }}
        />
      )}
    </main>
  );
}
