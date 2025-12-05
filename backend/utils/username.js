const RESERVED_USERNAMES = new Set([
  'admin',
  'support',
  'yochat',
  'system',
  'root',
]);

// Telegram-like rules (you can tweak)
const USERNAME_REGEX = /^[a-zA-Z0-9](?!.*__)[a-zA-Z0-9_]{3,30}[a-zA-Z0-9]$/;
// 5–32 chars, letters / digits / underscore, no __ in middle, no _ at start or end

function validateUsername(raw) {
  const username = (raw || '').trim();

  if (!username) {
    return { ok: false, reason: 'EMPTY' };
  }

  if (!USERNAME_REGEX.test(username)) {
    return { ok: false, reason: 'INVALID_FORMAT' };
  }

  if (RESERVED_USERNAMES.has(username.toLowerCase())) {
    return { ok: false, reason: 'RESERVED' };
  }

  return { ok: true, username, usernameSearch: username.toLowerCase() };
}

export default {
  validateUsername,
};
