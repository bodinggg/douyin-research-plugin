import crypto from 'node:crypto';
import { createAdapter, AdapterError } from './adapter.js';
import { validateSource, validateMode, validateBounds, PolicyError } from './policy.js';
import { hashRef, redact, privacySummary } from './privacy.js';
import { createStorage } from './storage.js';
const resultId = () => crypto.randomUUID();
const boundedLimit = (value) => { if (value === undefined) return 20; if (!Number.isInteger(value) || value < 1 || value > 50) throw new PolicyError('INVALID_LIMIT', 'limit must be an integer between 1 and 50'); return value; };
const errorResult = (error) => ({ status: 'blocked', error: { code: error?.code || 'UNKNOWN', message: error?.message || 'operation failed' }, privacy: privacySummary() });
export function createDyService(config = {}, dependencies = {}) {
  const adapter = dependencies.adapter || createAdapter(config); const storage = dependencies.storage || createStorage(config); const audit = dependencies.audit || (() => {});
  const call = async (action, fn) => { try { const value = await fn(); audit({ action, result: value.status || 'ok', mode: value.mode, sourceHash: value.sourceHash }); return value; } catch (error) { const value = errorResult(error); audit({ action, result: 'blocked', errorCode: value.error.code }); return value; } };
  return {
    dispose: () => adapter.dispose?.(),
    loginStatus: () => call('login.status', async () => ({ ...(await adapter.loginStatus()), checkedAt: new Date().toISOString() })),
    loginStart: (args = {}) => call('login.start', () => adapter.beginLogin({ surface: args.surface || 'public_site' })),
    sessionStatus: () => call('session.status', async () => ({ ...(await adapter.loginStatus()), checkedAt: new Date().toISOString() })),
    sessionClear: (args = {}) => args.confirm === true ? call('session.clear', () => adapter.clearSession()) : Promise.resolve({ status: 'blocked', error: { code: 'CONFIRMATION_REQUIRED', message: 'set confirm=true to clear the local browser session' } }),
    works: (args = {}) => call('works.read', () => adapter.readWorks({ limit: boundedLimit(args.limit) })),
    following: (args = {}) => call('following.read', () => adapter.readFollowing({ limit: boundedLimit(args.limit) })),
    comments: (args = {}) => call('comments.read', () => adapter.readComments({ workRef: args.workRef, limit: boundedLimit(args.limit) })),
    analytics: (args = {}) => call('analytics.read', () => adapter.readAnalytics({ range: args.range || 'recent' })),
    interpret: (args = {}) => call('video.interpret', async () => { const source = validateSource(args.source, config); const mode = validateMode(args.mode, config); validateBounds(args, config); const captured = await adapter.readVideo({ ...source, maxSeconds: args.maxSeconds, focus: args.focus }); if (captured.status === 'awaiting_user') return captured; const report = { resultId: resultId(), mode, status: captured.status || 'complete', sourceHash: hashRef(source.canonical), observed: redact(captured.observed || captured, config.privacy), findings: redact(captured.findings || [], config.privacy), gaps: redact(captured.gaps || [], config.privacy), provenance: redact(captured.provenance || [{ source: source.kind, status: 'observed' }], config.privacy), privacy: privacySummary() }; const persistedReport = { ...report, observed: { durationSeconds: report.observed.durationSeconds, videoPresent: report.observed.videoPresent }, findings: [], gaps: report.gaps, provenance: report.provenance }; const stored = await storage.save(persistedReport); return { ...report, persisted: stored.persisted }; }),
    detail: (args = {}) => call('interpretation.detail', async () => { const item = await storage.get(args.resultId); return item ? redact(item, config.privacy) : { status: 'blocked', error: { code: 'NOT_FOUND', message: 'interpretation result not found' } }; })
  };
}
export { AdapterError, PolicyError };
