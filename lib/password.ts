import argon2 from 'argon2';

const ARGON2_OPTS = {
  type: argon2.argon2id,
  memoryCost: 2 ** 16, // 64 MiB
  timeCost: 3, // ~120-250 ms
  parallelism: 1,
};

const PIN_PEPPER = process.env.PIN_PEPPER ?? '';

export function normalizePassword(pw: string): string {
  // Keine aggressive Trim-Logik, um absichtliche Leerzeichen nicht zu verlieren.
  // Entferne nur \r\n und normalisiere Unicode.
  return pw.replace(/\r?\n/g, '').normalize('NFKC');
}

/** Simple Policy - passe an deine Anforderungen an */
export function validatePasswordStrength(pw: string): {
  ok: boolean;
  message?: string;
} {
  if (pw.length < 8)
    return { ok: false, message: 'Mindestens 8 Zeichen erforderlich.' };
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
    return { ok: false, message: 'Buchstaben und Zahlen verwenden.' };
  }
  return { ok: true };
}

export function validatePinFormat(pin: string): {
  ok: boolean;
  message?: string;
} {
  if (!/^[0-9]{4,6}$/.test(pin))
    return { ok: false, message: 'PIN muss 4-6 Ziffern haben.' };
  // Optional: einfache Schwächetests
  return { ok: true };
}

/* ----------------------------- Hash / Verify ------------------------------- */

/** Passwort hashen (Argon2id) */
export async function hashPassword(password: string): Promise<string> {
  const pw = normalizePassword(password);
  const policy = validatePasswordStrength(pw);
  if (!policy.ok) throw new Error(`Ungültiges Passwort: ${policy.message}`);
  return argon2.hash(pw, ARGON2_OPTS);
}

/** Passwort prüfen */
export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  try {
    const pw = normalizePassword(password);
    return await argon2.verify(hash, pw);
  } catch {
    return false;
  }
}

/** PIN hashen (Argon2id + Pepper) */
export async function hashPin(pin: string): Promise<string> {
  const v = validatePinFormat(pin);
  if (!v.ok) throw new Error(`Ungültige PIN: ${v.message}`);
  const input = pin + PIN_PEPPER;
  return argon2.hash(input, ARGON2_OPTS);
}

/** PIN prüfen (Argon2id + Pepper) */
export async function verifyPin(hash: string, pin: string): Promise<boolean> {
  try {
    if (!/^[0-9]{4,6}$/.test(pin)) return false;
    return await argon2.verify(hash, pin + PIN_PEPPER);
  } catch {
    return false;
  }
}
