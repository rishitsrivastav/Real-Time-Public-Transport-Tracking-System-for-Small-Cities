// Generate a secure random password of length 8-10
// Includes uppercase, lowercase, numbers, and symbols
function generateRandomPassword() {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()-_=+[]{};:,.?';

  const all = upper + lower + numbers + symbols;

  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const length = randomInt(8, 10);

  // Ensure at least one of each type
  let password = '';
  password += upper[randomInt(0, upper.length - 1)];
  password += lower[randomInt(0, lower.length - 1)];
  password += numbers[randomInt(0, numbers.length - 1)];
  password += symbols[randomInt(0, symbols.length - 1)];

  // Fill remaining
  for (let i = password.length; i < length; i++) {
    password += all[randomInt(0, all.length - 1)];
  }

  // Shuffle characters for better randomness
  password = password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');

  return password;
}

module.exports = { generateRandomPassword };