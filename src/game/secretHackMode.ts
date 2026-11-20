export const SECRET_MODE_PIN = '7890';

export interface SecretModeState {
  unlocked: boolean;
  padVisible: boolean;
  queuedDiceValue: number | null;
}

export function createInitialSecretModeState(): SecretModeState {
  return {
    unlocked: false,
    padVisible: true,
    queuedDiceValue: null,
  };
}

export function verifySecretPin(pin: string): { ok: boolean; error?: string } {
  const clean = pin.trim();
  if (clean.length === 0) {
    return { ok: false, error: 'Please enter the 4-digit Secret PIN.' };
  }
  if (clean !== SECRET_MODE_PIN) {
    return { ok: false, error: 'Incorrect PIN. Secret Hack Mode stays locked.' };
  }
  return { ok: true };
}

export function unlockSecretMode(
  state: SecretModeState,
  pin: string,
): { ok: boolean; state: SecretModeState; error?: string } {
  const check = verifySecretPin(pin);
  if (!check.ok) {
    return { ok: false, state, error: check.error };
  }
  return {
    ok: true,
    state: {
      unlocked: true,
      padVisible: true,
      queuedDiceValue: null,
    },
  };
}

export function deactivateSecretMode(): SecretModeState {
  return {
    unlocked: false,
    padVisible: true,
    queuedDiceValue: null,
  };
}

export function toggleSecretPadVisibility(
  state: SecretModeState,
): SecretModeState {
  if (!state.unlocked) return state;
  return {
    ...state,
    padVisible: !state.padVisible,
  };
}

export function selectSecretDiceValue(
  state: SecretModeState,
  value: number | null,
): SecretModeState {
  if (!state.unlocked) return state;
  if (value === null) {
    return { ...state, queuedDiceValue: null };
  }
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    return state;
  }
  // Tapping the already queued number clears it back to normal random mode
  const nextValue = state.queuedDiceValue === value ? null : value;
  return {
    ...state,
    queuedDiceValue: nextValue,
  };
}

export function consumeNextDiceValue(
  state: SecretModeState,
  isAutomated: boolean,
  randomFn: () => number = Math.random,
): { rolledValue: number; wasForced: boolean; nextState: SecretModeState } {
  if (state.unlocked && !isAutomated && state.queuedDiceValue !== null) {
    const forced = Math.min(6, Math.max(1, Math.trunc(state.queuedDiceValue)));
    return {
      rolledValue: forced,
      wasForced: true,
      nextState: {
        ...state,
        queuedDiceValue: null,
      },
    };
  }

  const raw = randomFn();
  const clamped = Math.min(0.999999999, Math.max(0, raw));
  const randomRoll = Math.floor(clamped * 6) + 1;
  return {
    rolledValue: randomRoll,
    wasForced: false,
    nextState: state,
  };
}
