export const PASSWORD_HINT = "Use at least 8 characters with a letter and a number.";

const COMMON = new Set([
  "password",
  "password1",
  "123456",
  "12345678",
  "123456789",
  "aaaaaa",
  "aaaaaaa1",
  "abcdef",
  "abcdefgh",
  "qwerty",
  "qwertyui",
  "letmein",
  "letmein1",
  "admin123",
  "iloveyou",
]);

export function passwordError(password: string): string | null {
  if (password.length < 8 || password.length > 128) return PASSWORD_HINT;
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return PASSWORD_HINT;
  if (COMMON.has(password.toLowerCase())) return "Choose a less common password.";
  return null;
}
