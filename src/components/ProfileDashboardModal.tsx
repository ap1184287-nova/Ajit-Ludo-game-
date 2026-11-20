import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Edit3,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  MAX_MATCH_PLAYERS,
  MAX_PLAYER_AGE,
  MIN_PLAYER_AGE,
  verifyProfilePin,
} from '../game/playerProfiles';
import { ALL_AVATARS } from '../game/progression';
import { AvatarId, PlayerProfile, PlayerProfileStore } from '../game/types';
import { PlayerAvatar } from './PlayerAvatar';

interface ProfileDashboardModalProps {
  store: PlayerProfileStore;
  tamperDetected: boolean;
  inActiveMatch?: boolean;
  activeMatchProfileIds?: readonly string[];
  onCreateProfile: (input: {
    name: string;
    age: number;
    avatarId: AvatarId;
    pin?: string;
  }) => { ok: boolean; error?: string };
  onUpdateProfile: (
    profileId: string,
    input: { name: string; age: number; avatarId: AvatarId; pin?: string },
    authPin?: string,
    clearPin?: boolean,
  ) => { ok: boolean; error?: string };
  onDeleteProfile: (
    profileId: string,
    authPin?: string,
  ) => { ok: boolean; error?: string };
  onToggleSquadProfile: (profileId: string) => { ok: boolean; error?: string };
  onApplyAndPlay?: () => void;
  onClose: () => void;
}

type ModalMode = 'dashboard' | 'create' | 'edit' | 'pin_gate' | 'confirm_delete';

export const ProfileDashboardModal: React.FC<ProfileDashboardModalProps> = ({
  store,
  tamperDetected,
  inActiveMatch = false,
  activeMatchProfileIds = [],
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
  onToggleSquadProfile,
  onApplyAndPlay,
  onClose,
}) => {
  const [mode, setMode] = useState<ModalMode>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Create / Edit Form state
  const [targetProfile, setTargetProfile] = useState<PlayerProfile | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [ageInput, setAgeInput] = useState('21');
  const [avatarInput, setAvatarInput] = useState<AvatarId>('king');
  const [pinInput, setPinInput] = useState('');
  const [clearExistingPin, setClearExistingPin] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // PIN verification gate for locked profiles
  const [pendingAction, setPendingAction] = useState<'edit' | 'delete' | null>(null);
  const [unlockPinInput, setUnlockPinInput] = useState('');
  const [verifiedPin, setVerifiedPin] = useState<string | undefined>(undefined);
  const [pinGateError, setPinGateError] = useState<string | null>(null);

  const squadSet = useMemo(
    () => new Set(store.activeSquadProfileIds),
    [store.activeSquadProfileIds],
  );

  const squadProfiles = useMemo(() => {
    const byId = new Map(store.profiles.map((p) => [p.id, p]));
    return store.activeSquadProfileIds
      .map((id) => byId.get(id))
      .filter((p): p is PlayerProfile => Boolean(p));
  }, [store.profiles, store.activeSquadProfileIds]);

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return store.profiles;
    return store.profiles.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.playerId.toLowerCase().includes(q),
    );
  }, [store.profiles, searchQuery]);

  const openCreateForm = () => {
    setBannerError(null);
    setBannerNotice(null);
    setTargetProfile(null);
    setNameInput('');
    setAgeInput('21');
    setAvatarInput('king');
    setPinInput('');
    setClearExistingPin(false);
    setVerifiedPin(undefined);
    setFormError(null);
    setMode('create');
  };

  const openEditForm = (profile: PlayerProfile, authPin?: string) => {
    setBannerError(null);
    setBannerNotice(null);
    setTargetProfile(profile);
    setNameInput(profile.name);
    setAgeInput(String(profile.age));
    setAvatarInput(profile.avatarId);
    setPinInput('');
    setClearExistingPin(false);
    setVerifiedPin(authPin);
    setFormError(null);
    setMode('edit');
  };

  const handleRequestEdit = (profile: PlayerProfile) => {
    setBannerError(null);
    setBannerNotice(null);
    if (profile.pinHash) {
      setTargetProfile(profile);
      setPendingAction('edit');
      setUnlockPinInput('');
      setPinGateError(null);
      setMode('pin_gate');
      return;
    }
    openEditForm(profile);
  };

  const handleRequestDelete = (profile: PlayerProfile) => {
    setBannerError(null);
    setBannerNotice(null);
    if (activeMatchProfileIds.includes(profile.id)) {
      setBannerError(
        `Cannot delete "${profile.name}" while participating in an active match.`,
      );
      return;
    }
    setTargetProfile(profile);
    if (profile.pinHash) {
      setPendingAction('delete');
      setUnlockPinInput('');
      setPinGateError(null);
      setMode('pin_gate');
      return;
    }
    setVerifiedPin(undefined);
    setMode('confirm_delete');
  };

  const handleVerifyPinGate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProfile) return;
    const clean = unlockPinInput.trim();
    if (!verifyProfilePin(targetProfile, clean)) {
      setPinGateError('Incorrect 4-digit PIN. Access denied.');
      return;
    }
    setPinGateError(null);
    if (pendingAction === 'edit') {
      openEditForm(targetProfile, clean);
    } else if (pendingAction === 'delete') {
      setVerifiedPin(clean);
      setMode('confirm_delete');
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const parsedAge = Number(ageInput.trim());

    if (mode === 'create') {
      const res = onCreateProfile({
        name: nameInput,
        age: parsedAge,
        avatarId: avatarInput,
        pin: pinInput.trim() || undefined,
      });
      if (!res.ok) {
        setFormError(res.error ?? 'Could not create profile.');
        return;
      }
      setBannerNotice(`Profile "${nameInput.trim()}" created & saved!`);
      setMode('dashboard');
      return;
    }

    if (mode === 'edit' && targetProfile) {
      const res = onUpdateProfile(
        targetProfile.id,
        {
          name: nameInput,
          age: parsedAge,
          avatarId: avatarInput,
          pin: pinInput.trim() || undefined,
        },
        verifiedPin,
        clearExistingPin,
      );
      if (!res.ok) {
        setFormError(res.error ?? 'Could not update profile.');
        return;
      }
      setBannerNotice(`Profile "${nameInput.trim()}" updated.`);
      setMode('dashboard');
    }
  };

  const handleConfirmDelete = () => {
    if (!targetProfile) return;
    const res = onDeleteProfile(targetProfile.id, verifiedPin);
    if (!res.ok) {
      setBannerError(res.error ?? 'Unable to delete profile.');
      setMode('dashboard');
      return;
    }
    setBannerNotice(`Profile "${targetProfile.name}" deleted.`);
    setTargetProfile(null);
    setVerifiedPin(undefined);
    setMode('dashboard');
  };

  const handleToggleSquad = (profileId: string) => {
    setBannerError(null);
    setBannerNotice(null);
    if (inActiveMatch) {
      setBannerError('Exit or finish the current match to change player lineup.');
      return;
    }
    const res = onToggleSquadProfile(profileId);
    if (!res.ok) {
      setBannerError(res.error ?? 'Cannot modify match lineup.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 safe-top safe-bottom safe-x"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ludo-player-system-title"
    >
      <div className="animate-pop-in w-full max-w-[780px] max-h-[92dvh] overflow-hidden rounded-3xl border-2 border-[#00d4ff]/55 bg-[#040711] shadow-[0_0_50px_rgba(0,212,255,0.22)] flex flex-col">
        {/* Top Black & Electric Blue Gaming Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#00d4ff]/25 bg-gradient-to-r from-[#050914] via-[#09152b] to-[#050914] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#00d4ff]/15 border border-[#00d4ff]/60 flex items-center justify-center shadow-[0_0_16px_rgba(0,212,255,0.28)] shrink-0">
              <Users size={20} className="text-[#00d4ff]" />
            </div>
            <div className="min-w-0">
              <h2
                id="ludo-player-system-title"
                className="text-base sm:text-xl font-black tracking-wide text-white truncate"
              >
                LUDO <span className="text-[#00d4ff]">PLAYER SYSTEM</span>
              </h2>
              <p className="text-[11px] sm:text-xs font-semibold text-sky-200/80 flex items-center gap-1.5 truncate">
                <ShieldCheck size={12} className="text-[#00d4ff] shrink-0" />
                <span>
                  {store.profiles.length} Profiles · Max 4 Players
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Ludo Player System"
            className="min-w-[44px] min-h-[44px] rounded-2xl bg-[#0a1326] hover:bg-[#11203d] border border-[#00d4ff]/40 text-sky-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 bg-[#040711]">
          {tamperDetected && (
            <div
              role="alert"
              className="rounded-2xl border border-amber-400/60 bg-amber-950/40 px-3.5 py-2.5 flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-amber-100"
            >
              <AlertTriangle size={17} className="text-amber-300 shrink-0" />
              <span>
                Unauthorized external profile data modification was detected and blocked to protect player records.
              </span>
            </div>
          )}

          {bannerError && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-400/60 bg-rose-950/50 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs sm:text-sm font-semibold text-rose-100"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-300 shrink-0" />
                {bannerError}
              </span>
              <button
                type="button"
                onClick={() => setBannerError(null)}
                aria-label="Dismiss error"
                className="text-rose-200 hover:text-white p-1 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {bannerNotice && (
            <div
              role="status"
              className="rounded-2xl border border-[#00d4ff]/50 bg-[#07182e] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs sm:text-sm font-semibold text-sky-100"
            >
              <span className="flex items-center gap-2">
                <Check size={16} className="text-[#00d4ff] shrink-0" />
                {bannerNotice}
              </span>
              <button
                type="button"
                onClick={() => setBannerNotice(null)}
                aria-label="Dismiss notice"
                className="text-sky-200 hover:text-white p-1 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {mode === 'dashboard' && (
            <>
              {/* Active Match Squad Strip (Up to 4 Independent Players, Color-Neutral) */}
              <section
                aria-label="Active Match Lineup (Max 4 Players)"
                className="rounded-2xl border border-[#00d4ff]/35 bg-[#080e1d] p-3 sm:p-3.5 flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
                      <UserCheck size={15} className="text-[#00d4ff]" />
                      Match Players Lineup
                    </h3>
                    <p className="text-[11px] text-sky-200/75 mt-0.5">
                      Add up to 4 unique players by Name &amp; Player ID (no token color lock)
                    </p>
                  </div>
                  <span className="text-xs font-black text-[#00d4ff] tabular-nums">
                    {squadProfiles.length} / {MAX_MATCH_PLAYERS} Added
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((slotIdx) => {
                    const prof = squadProfiles[slotIdx];
                    return prof ? (
                      <div
                        key={prof.id}
                        className="rounded-xl border border-[#00d4ff]/50 bg-[#0b1730] px-2 py-1.5 flex items-center justify-between gap-1 min-w-0"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="hidden sm:inline-flex shrink-0">
                            <PlayerAvatar
                              avatarId={prof.avatarId}
                              neutralElectricBlue
                              size={28}
                            />
                          </span>
                          <div className="min-w-0 leading-tight">
                            <div className="text-xs font-extrabold text-white truncate">
                              {prof.name}
                            </div>
                            <div className="text-[10px] font-mono font-bold text-[#00d4ff] whitespace-nowrap tabular-nums">
                              {prof.playerId}
                            </div>
                          </div>
                        </div>
                        {!inActiveMatch && (
                          <button
                            type="button"
                            onClick={() => handleToggleSquad(prof.id)}
                            aria-label={`Remove ${prof.name} from match squad`}
                            className="w-6 h-6 rounded-lg bg-[#050a16] hover:bg-rose-950 border border-[#00d4ff]/25 text-sky-200 hover:text-rose-200 flex items-center justify-center shrink-0 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div
                        key={slotIdx}
                        className="rounded-xl border border-dashed border-[#00d4ff]/25 bg-[#050914] px-2.5 py-2 flex items-center justify-center text-[11px] font-semibold text-slate-400 min-h-[48px]"
                      >
                        Slot {slotIdx + 1} · Open
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Search & Create Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#00d4ff]/80 pointer-events-none"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Name or Player ID (LPS-…)"
                    aria-label="Search player profiles by name or ID"
                    className="w-full min-h-[44px] pl-10 pr-3.5 rounded-2xl bg-[#080e1d] border border-[#00d4ff]/30 focus:border-[#00d4ff] focus:outline-none text-sm font-medium text-white placeholder:text-slate-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={openCreateForm}
                  className="min-h-[44px] px-4 rounded-2xl bg-gradient-to-b from-[#00d4ff] to-[#0284c7] hover:from-[#38bdf8] hover:to-[#0369a1] active:translate-y-[1px] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,212,255,0.3)] whitespace-nowrap shrink-0 cursor-pointer transition-all"
                >
                  <Plus size={17} strokeWidth={2.8} />
                  Create Profile
                </button>
              </div>

              {/* Profiles Dashboard Grid */}
              {store.profiles.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#00d4ff]/35 bg-[#070c18] p-8 flex flex-col items-center text-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#00d4ff]/10 border border-[#00d4ff]/40 flex items-center justify-center">
                    <UserPlus size={26} className="text-[#00d4ff]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      No Player Profiles Created Yet
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-sm">
                      Create individual player profiles with Name, Age, and an auto-generated Unique Player ID to track each player separately.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="min-h-[46px] px-5 rounded-2xl bg-gradient-to-b from-[#00d4ff] to-[#0284c7] text-slate-950 font-black text-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Plus size={17} />
                    Create First Profile
                  </button>
                </div>
              ) : filteredProfiles.length === 0 ? (
                <div className="rounded-2xl border border-[#00d4ff]/20 bg-[#070c18] p-6 text-center text-sm text-slate-300">
                  No profiles match &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredProfiles.map((prof) => {
                    const inSquad = squadSet.has(prof.id);
                    const squadFull =
                      !inSquad &&
                      store.activeSquadProfileIds.length >= MAX_MATCH_PLAYERS;
                    const slotPos = store.activeSquadProfileIds.indexOf(prof.id);

                    return (
                      <article
                        key={prof.id}
                        aria-label={`Profile ${prof.name}`}
                        className={`rounded-2xl border p-3.5 flex flex-col gap-3 transition-all ${
                          inSquad
                            ? 'border-[#00d4ff]/70 bg-gradient-to-b from-[#0a1830] to-[#060c18] shadow-[0_0_24px_rgba(0,212,255,0.14)]'
                            : 'border-[#00d4ff]/25 bg-[#070c18] hover:border-[#00d4ff]/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <PlayerAvatar
                              avatarId={prof.avatarId}
                              neutralElectricBlue
                              size={46}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-sm sm:text-base font-black text-white truncate">
                                  {prof.name}
                                </h4>
                                {prof.pinHash && (
                                  <Lock
                                    size={13}
                                    className="text-[#00d4ff] shrink-0"
                                    aria-label="PIN Protected"
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs mt-0.5">
                                <span className="font-mono font-bold text-[#00d4ff] tabular-nums">
                                  {prof.playerId}
                                </span>
                                <span className="text-slate-500" aria-hidden="true">
                                  ·
                                </span>
                                <span className="font-semibold text-slate-200 tabular-nums">
                                  Age {prof.age}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Separated Per-Player Lifetime Metrics */}
                        <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#040711] border border-[#00d4ff]/15 px-2.5 py-2 text-center">
                          <div>
                            <div className="text-[11px] font-semibold text-sky-200/70">
                              Matches
                            </div>
                            <div className="text-sm font-black text-white tabular-nums">
                              {prof.matchesPlayed}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold text-sky-200/70">
                              Wins
                            </div>
                            <div className="text-sm font-black text-[#00d4ff] tabular-nums">
                              {prof.matchesWon}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold text-sky-200/70">
                              Captures
                            </div>
                            <div className="text-sm font-black text-white tabular-nums">
                              {prof.totalCaptures}
                            </div>
                          </div>
                        </div>

                        {/* Card Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={inActiveMatch || squadFull}
                            onClick={() => handleToggleSquad(prof.id)}
                            className={`flex-1 min-h-[42px] px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                              inSquad
                                ? 'bg-[#00d4ff]/20 border border-[#00d4ff] text-[#7dd3fc] hover:bg-[#00d4ff]/30'
                                : squadFull || inActiveMatch
                                  ? 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                                  : 'bg-[#0c1a36] hover:bg-[#12264d] border border-[#00d4ff]/40 text-white'
                            }`}
                          >
                            <UserCheck size={14} />
                            {inSquad
                              ? `In Match (#${slotPos + 1})`
                              : squadFull
                                ? 'Squad Full (4/4)'
                                : 'Add to Match'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRequestEdit(prof)}
                            aria-label={`Edit profile ${prof.name}`}
                            className="min-w-[44px] min-h-[42px] px-2.5 rounded-xl bg-[#091224] hover:bg-[#112244] border border-[#00d4ff]/30 text-sky-200 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRequestDelete(prof)}
                            aria-label={`Delete profile ${prof.name}`}
                            className="min-w-[44px] min-h-[42px] px-2.5 rounded-xl bg-[#160b14] hover:bg-rose-950 border border-rose-500/35 text-rose-300 hover:text-rose-100 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {(mode === 'create' || mode === 'edit') && (
            <form
              onSubmit={handleSubmitForm}
              className="rounded-2xl border border-[#00d4ff]/35 bg-[#070d1b] p-4 sm:p-5 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setMode('dashboard')}
                  className="min-h-[40px] px-3 rounded-xl bg-[#0b152a] hover:bg-[#122140] border border-[#00d4ff]/30 text-xs font-bold text-sky-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
                <h3 className="text-base sm:text-lg font-black text-white">
                  {mode === 'create' ? 'Create Player Profile' : 'Edit Player Profile'}
                </h3>
              </div>

              {/* Unique Player ID Readonly Display */}
              <div className="rounded-xl border border-[#00d4ff]/30 bg-[#040812] px-3.5 py-2.5 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-sky-200">
                  Unique Player ID (Immutable)
                </span>
                <span className="font-mono text-xs sm:text-sm font-black text-[#00d4ff] tabular-nums">
                  {targetProfile ? targetProfile.playerId : 'Auto-Generated (LPS-XXXXXX)'}
                </span>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/60 bg-rose-950/50 px-3 py-2 text-xs sm:text-sm font-semibold text-rose-100 flex items-center gap-2"
                >
                  <AlertTriangle size={15} className="text-rose-300 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label
                    htmlFor="profile-name-input"
                    className="text-xs font-bold text-sky-100"
                  >
                    Player Name
                  </label>
                  <input
                    id="profile-name-input"
                    type="text"
                    required
                    maxLength={24}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter unique player name"
                    className="min-h-[46px] px-3.5 rounded-xl bg-[#040812] border border-[#00d4ff]/35 focus:border-[#00d4ff] focus:outline-none text-sm font-semibold text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="profile-age-input"
                    className="text-xs font-bold text-sky-100"
                  >
                    Age ({MIN_PLAYER_AGE}–{MAX_PLAYER_AGE})
                  </label>
                  <input
                    id="profile-age-input"
                    type="number"
                    required
                    min={MIN_PLAYER_AGE}
                    max={MAX_PLAYER_AGE}
                    value={ageInput}
                    onChange={(e) => setAgeInput(e.target.value)}
                    className="min-h-[46px] px-3.5 rounded-xl bg-[#040812] border border-[#00d4ff]/35 focus:border-[#00d4ff] focus:outline-none text-sm font-semibold text-white tabular-nums"
                  />
                </div>
              </div>

              {/* Color-Neutral Electric Blue Avatar Selector */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-sky-100">
                  Choose Avatar
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {ALL_AVATARS.map((av) => {
                    const selected = avatarInput === av.id;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setAvatarInput(av.id)}
                        aria-label={`Select ${av.label} avatar`}
                        aria-pressed={selected}
                        className={`min-h-[54px] p-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          selected
                            ? 'border-[#00d4ff] bg-[#0b2342] shadow-[0_0_12px_rgba(0,212,255,0.3)]'
                            : 'border-[#00d4ff]/20 bg-[#040812] hover:border-[#00d4ff]/50'
                        }`}
                      >
                        <PlayerAvatar
                          avatarId={av.id}
                          neutralElectricBlue
                          size={34}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional 4-Digit Security Lock PIN */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="profile-pin-input"
                    className="text-xs font-bold text-sky-100 flex items-center gap-1.5"
                  >
                    <Lock size={13} className="text-[#00d4ff]" />
                    4-Digit Edit Lock PIN (Optional)
                  </label>
                  {mode === 'edit' && targetProfile?.pinHash && (
                    <button
                      type="button"
                      onClick={() => setClearExistingPin((v) => !v)}
                      className="text-[11px] font-bold text-sky-300 hover:text-white underline cursor-pointer"
                    >
                      {clearExistingPin ? 'Keep Existing Lock' : 'Remove Lock'}
                    </button>
                  )}
                </div>
                <input
                  id="profile-pin-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  disabled={clearExistingPin}
                  value={pinInput}
                  onChange={(e) =>
                    setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))
                  }
                  placeholder={
                    mode === 'edit' && targetProfile?.pinHash
                      ? clearExistingPin
                        ? 'Lock will be removed on save'
                        : 'Leave blank to keep existing PIN'
                      : 'Optional 4-digit PIN to prevent unauthorized edits'
                  }
                  className="min-h-[44px] px-3.5 rounded-xl bg-[#040812] border border-[#00d4ff]/30 focus:border-[#00d4ff] focus:outline-none text-sm font-mono text-white placeholder:text-slate-500 disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setMode('dashboard')}
                  className="min-h-[48px] rounded-2xl bg-[#0b1326] hover:bg-[#13203d] border border-slate-700 text-slate-200 font-bold text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[48px] rounded-2xl bg-gradient-to-b from-[#00d4ff] to-[#0284c7] hover:from-[#38bdf8] hover:to-[#0369a1] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,212,255,0.3)] cursor-pointer"
                >
                  <Check size={17} />
                  {mode === 'create' ? 'Save Profile' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {mode === 'pin_gate' && targetProfile && (
            <form
              onSubmit={handleVerifyPinGate}
              className="rounded-2xl border border-[#00d4ff]/45 bg-[#070d1b] p-5 flex flex-col gap-3.5 max-w-md mx-auto w-full"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#00d4ff]/15 border border-[#00d4ff]/50 flex items-center justify-center">
                  <Unlock size={18} className="text-[#00d4ff]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Unlock Profile ({targetProfile.name})
                  </h3>
                  <p className="text-xs font-mono text-[#00d4ff]">
                    {targetProfile.playerId}
                  </p>
                </div>
              </div>

              {pinGateError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/60 bg-rose-950/50 px-3 py-2 text-xs font-semibold text-rose-100"
                >
                  {pinGateError}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="unlock-pin-input"
                  className="text-xs font-bold text-sky-100"
                >
                  Enter 4-Digit Profile PIN to {pendingAction === 'delete' ? 'Delete' : 'Edit'}
                </label>
                <input
                  id="unlock-pin-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  autoFocus
                  value={unlockPinInput}
                  onChange={(e) =>
                    setUnlockPinInput(
                      e.target.value.replace(/\D/g, '').slice(0, 4),
                    )
                  }
                  placeholder="••••"
                  className="min-h-[48px] px-4 rounded-xl bg-[#040812] border border-[#00d4ff]/45 focus:border-[#00d4ff] focus:outline-none text-lg font-mono tracking-[0.4em] text-center text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('dashboard')}
                  className="min-h-[44px] rounded-xl bg-[#0b1326] border border-slate-700 text-slate-200 text-sm font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] rounded-xl bg-gradient-to-b from-[#00d4ff] to-[#0284c7] text-slate-950 text-sm font-black cursor-pointer"
                >
                  Verify PIN
                </button>
              </div>
            </form>
          )}

          {mode === 'confirm_delete' && targetProfile && (
            <div
              role="alertdialog"
              aria-label={`Confirm delete profile ${targetProfile.name}`}
              className="rounded-2xl border-2 border-rose-500/60 bg-[#14070e] p-5 flex flex-col gap-3.5 max-w-md mx-auto w-full"
            >
              <div className="flex items-center gap-2.5 text-rose-100">
                <AlertTriangle size={20} className="text-rose-400 shrink-0" />
                <div>
                  <h3 className="text-base font-black text-white">
                    Delete Profile &ldquo;{targetProfile.name}&rdquo;?
                  </h3>
                  <p className="text-xs font-mono text-[#00d4ff] mt-0.5">
                    {targetProfile.playerId} · Age {targetProfile.age}
                  </p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-rose-100/85">
                This will permanently remove this player profile and its saved lifetime stats from this device.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('dashboard')}
                  className="min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 text-sm font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="min-h-[44px] rounded-xl bg-gradient-to-b from-rose-500 to-rose-700 hover:from-rose-400 hover:to-rose-600 text-white text-sm font-black cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        {mode === 'dashboard' && (
          <div className="px-4 sm:px-6 py-3 border-t border-[#00d4ff]/20 bg-[#050914] flex items-center justify-between gap-3 shrink-0">
            <span className="text-xs font-semibold text-slate-300 truncate">
              {squadProfiles.length > 0
                ? `${squadProfiles.length} player${squadProfiles.length > 1 ? 's' : ''} ready for match`
                : 'Select or create profiles to play'}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {onApplyAndPlay && !inActiveMatch && squadProfiles.length >= 1 ? (
                <button
                  type="button"
                  onClick={onApplyAndPlay}
                  className="min-h-[44px] px-4 rounded-xl bg-gradient-to-b from-[#00d4ff] to-[#0284c7] hover:from-[#38bdf8] hover:to-[#0369a1] text-slate-950 text-xs sm:text-sm font-black cursor-pointer"
                >
                  Apply &amp; Play
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-4 rounded-xl bg-[#0c1a36] hover:bg-[#12264d] border border-[#00d4ff]/45 text-white text-xs sm:text-sm font-bold cursor-pointer"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
