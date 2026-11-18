const COMMON = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890', 'qwerty123',
  'qwertyuiop', 'iloveyou', 'admin123', 'welcome1', 'letmein1', 'flatmate', 'abc12345',
]);

/**
 * Returns { level: 'weak' | 'medium' | 'good', score: 1..3, tip }.
 * Under 8 characters (the server minimum) is always weak.
 */
export function passwordStrength(pw = '') {
  const checks = {
    long: pw.length >= 12,
    mixedCase: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
    digit: /\d/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
  const points = (pw.length >= 8 ? 1 : 0) + Object.values(checks).filter(Boolean).length;

  const tooSimple = COMMON.has(pw.toLowerCase()) || /^(.)\1+$/.test(pw);
  if (pw.length < 8 || tooSimple || points <= 2) {
    return { level: 'weak', score: 1, tip: pw.length < 8 ? `${8 - pw.length} more character${pw.length === 7 ? '' : 's'} needed` : tooSimple ? 'Too common — pick something less guessable' : nextTip(checks) };
  }
  if (points === 3) return { level: 'medium', score: 2, tip: nextTip(checks) };
  return { level: 'good', score: 3, tip: 'Nice — that’s a strong password' };
}

function nextTip(c) {
  if (!c.mixedCase) return 'Mix upper and lower case letters';
  if (!c.digit) return 'Add a number';
  if (!c.symbol) return 'Add a symbol like ! or #';
  if (!c.long) return 'Use 12 or more characters';
  return '';
}
