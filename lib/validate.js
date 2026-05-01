/** Input validation utilities */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PW = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export function validateEmail(email) {
  if (!email || typeof email !== 'string') return 'Email is required.';
  if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(pw, { requireStrong = false } = {}) {
  if (!pw) return 'Password is required.';
  if (pw.length < 6) return 'Password must be at least 6 characters.';
  if (requireStrong && !STRONG_PW.test(pw))
    return 'Password must contain uppercase, lowercase, and a number (min 8 chars).';
  return null;
}

export function validateName(name) {
  if (!name || !name.trim()) return 'Name is required.';
  if (name.trim().length < 2) return 'Name must be at least 2 characters.';
  if (name.trim().length > 80) return 'Name must be under 80 characters.';
  return null;
}

/** Strip basic XSS patterns from a string */
export function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/** Validate a full auth signup form — returns errors object */
export function validateSignup({ name, email, password }) {
  const errors = {};
  const nameErr = validateName(name);
  const emailErr = validateEmail(email);
  const pwErr = validatePassword(password, { requireStrong: false });
  if (nameErr)  errors.name = nameErr;
  if (emailErr) errors.email = emailErr;
  if (pwErr)    errors.password = pwErr;
  return errors; // empty = valid
}

/** Validate login form */
export function validateLogin({ email, password }) {
  const errors = {};
  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;
  if (!password) errors.password = 'Password is required.';
  return errors;
}
