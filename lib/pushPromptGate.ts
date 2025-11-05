// SSR-safe helpers für localStorage
const KEY_SNOOZE_UNTIL = 'pushPrompt:snoozeUntil';
const KEY_DONE = 'pushPrompt:done';

function now() {
  return Date.now();
}
function lsGet(key: string) {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function lsSet(key: string, val: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, val);
  } catch {}
}

/** Auf später verschieben (z. B. 24h) */
export function snoozePushPrompt(ms = 24 * 60 * 60 * 1000) {
  lsSet(KEY_SNOOZE_UNTIL, String(now() + ms));
}

/** Prompt nicht mehr automatisch öffnen (nach erfolgreicher Registrierung) */
export function markPushPromptDone() {
  lsSet(KEY_DONE, '1');
}

/** Prüfen, ob Modal automatisch geöffnet werden darf */
export function shouldAutoOpenPushPrompt(opts: {
  pushEnabled: boolean;
  hasToken: boolean;
  permission: NotificationPermission | 'default' | 'denied' | 'granted';
}): boolean {
  // Bereits komplett eingerichtet? -> nein
  if (opts.pushEnabled && opts.permission === 'granted' && opts.hasToken)
    return false;

  // User hat manuell deaktiviert? -> nein
  if (!opts.pushEnabled) return false;

  // User hat es „erledigt“ markiert? -> nein
  const done = lsGet(KEY_DONE) === '1';
  if (done) return false;

  // Snooze aktiv?
  const snoozeUntilStr = lsGet(KEY_SNOOZE_UNTIL);
  const snoozeUntil = snoozeUntilStr ? Number(snoozeUntilStr) : 0;
  if (snoozeUntil && now() < snoozeUntil) return false;

  // Wenn Permission denied, nicht nerven – nur manuell öffnen lassen
  if (opts.permission === 'denied') return false;

  // Ansonsten: ja, auto-open
  return true;
}
