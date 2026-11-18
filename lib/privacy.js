import crypto from 'node:crypto';
export function hashRef(value) { return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 24); }
export function redact(value, config = {}) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return config.redactUserNames ? value.replace(/@[\w\u4e00-\u9fff-]{1,30}/g, '@[redacted]') : value;
  if (Array.isArray(value)) return value.map((item) => redact(item, config));
  if (typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (['url', 'rawUrl', 'caption', 'comment', 'cookie', 'token', 'password', 'qr'].includes(key)) continue;
      if (config.redactUserNames && ['userName', 'nickname', 'uid'].includes(key)) continue;
      out[key] = redact(item, config);
    }
    return out;
  }
  return value;
}
export function privacySummary() { return { redacted: true, rawStored: false, framesStored: false }; }
