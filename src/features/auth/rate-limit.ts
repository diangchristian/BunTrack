/** One email's sign-in tries: how many (including the current one) and when the last wrong password was (ms). */
export type LoginAttempts = { attempts: number; lastFailure: number };

const MAX_TRIES = 5;
/** Wrong passwords older than this no longer count. */
export const LOGIN_WINDOW_MS = 15 * 60_000;

/** Minutes until this email may try again; 0 means this try may check the password. */
export function lockedForMinutes({ attempts, lastFailure }: LoginAttempts, now: number) {
  if (attempts <= MAX_TRIES) return 0;
  const left = LOGIN_WINDOW_MS - (now - lastFailure);
  return left > 0 ? Math.ceil(left / 60_000) : 0;
}
