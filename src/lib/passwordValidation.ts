const MIN_LENGTH = 8;

export function validatePassword(password: string): string | null {
  if (password.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters.`;
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include a lowercase letter.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include an uppercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include a number.';
  }
  return null;
}

export const PASSWORD_HINT = 'At least 8 characters with uppercase, lowercase, and a number.';
