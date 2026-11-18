import crypto from 'node:crypto';
export function hashRef(value) { return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 24); }
export function redact(value, config = {}) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return config.redactUserNames !== false ? value.replace(/@[\w\u4e00-\u9fff-]{1,30}/g, '@[redacted]') : value;
  if (Array.isArray(value)) return value.map((item) => redact(item, config));
  if (typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (/^(?:url|rawurl|caption|captions|comment|comments|cookie|cookies|token|accesstoken|password|qr|qrcode|frame|frames|image|images|screenshot|screenshots)$/i.test(key)) continue;
      if (config.redactUserNames !== false && /^(?:username|nickname|uid|secuid|sec_uid|author|accountname)$/i.test(key)) continue;
      out[key] = redact(item, config);
    }
    return out;
  }
  return value;
}
export function privacySummary() { return { redacted: true, rawStored: false, framesStored: false }; }
