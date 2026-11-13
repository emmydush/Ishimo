// Shared client-side validation helpers for registration forms.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
// Rwanda mobile numbers: optional +250 / 250 / 0 prefix, then 7X XXX XXX.
const RWANDA_PHONE_RE = /^(?:\+?250|0)7\d{8}$/;

export const isValidEmail = (email) => EMAIL_RE.test(email);

export const isValidPassword = (password) => PASSWORD_RE.test(password);

export const isValidRwandaPhone = (phone) => {
  const normalized = phone.replace(/[\s\-().]/g, '');
  return RWANDA_PHONE_RE.test(normalized);
};
