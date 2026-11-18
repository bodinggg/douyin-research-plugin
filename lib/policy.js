export class PolicyError extends Error { constructor(code, message) { super(message); this.code = code; } }
export function validateSource(source, config) {
  if (!source || typeof source !== 'object') throw new PolicyError('INVALID_SOURCE', 'source is required');
  const keys = Object.keys(source).filter((key) => source[key]);
  if (keys.length !== 1 || !['url', 'file'].includes(keys[0])) throw new PolicyError('INVALID_SOURCE', 'provide exactly one URL or file source');
  if (source.url) {
    let parsed; try { parsed = new URL(source.url); } catch { throw new PolicyError('INVALID_URL', 'source URL is invalid'); }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) throw new PolicyError('INVALID_URL', 'source must be an HTTPS URL without credentials or a custom port');
    if (!['douyin.com', 'www.douyin.com'].includes(parsed.hostname)) throw new PolicyError('HOST_NOT_ALLOWED', 'source host is not on the Douyin allowlist');
    if (!/^\/video\/\d+\/?$/.test(parsed.pathname)) throw new PolicyError('INVALID_URL', 'provide a full Douyin video URL: https://www.douyin.com/video/VIDEO_ID');
    return { kind: 'url', canonical: `${parsed.origin}${parsed.pathname}` };
  }
  if (!config?.interpretation?.allowLocalFiles) throw new PolicyError('LOCAL_FILE_DISABLED', 'local files are disabled by configuration');
  return { kind: 'file', canonical: String(source.file) };
}
export function validateMode(mode, config) {
  const value = mode ?? config?.interpretation?.defaultMode ?? 'simple';
  if (!['simple', 'full'].includes(value)) throw new PolicyError('INVALID_MODE', 'mode must be simple or full');
  if (value === 'full') throw new PolicyError('CAPABILITY_UNAVAILABLE', 'Full audiovisual interpretation is not available. Use simple for visible video metadata.');
  return value;
}
export function validateBounds(args, config) {
  const max = config?.interpretation?.maxDurationSec ?? 600;
  if (args?.maxSeconds !== undefined && (!Number.isFinite(args.maxSeconds) || args.maxSeconds <= 0 || args.maxSeconds > max)) throw new PolicyError('INPUT_TOO_LARGE', `maxSeconds must be between 1 and ${max}`);
}
