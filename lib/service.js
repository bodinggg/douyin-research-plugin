import crypto from 'node:crypto';
import { createAdapter, AdapterError } from './adapter.js';
import { validateSource, validateMode, validateBounds, PolicyError } from './policy.js';
import { hashRef, redact, privacySummary } from './privacy.js';
import { createStorage } from './storage.js';
const resultId = () => crypto.randomUUID();
const errorResult = (error) => ({ status: 'blocked', error: { code: error?.code || 'UNKNOWN', message: error?.message || 'operation failed' }, privacy: privacySummary() });
export function createDyService(config = {}, dependencies = {}) {
  const adapter = dependencies.adapter || createAdapter(config); const storage = dependencies.storage || createStorage(config); const audit = dependencies.audit || (() => {});
  const call = async (action, fn) => { try { const value = await fn(); audit({ action, result: value.status || 'ok', mode: value.mode, sourceHash: value.sourceHash }); return value; } catch (error) { const value = errorResult(error); audit({ action, result: 'blocked', errorCode: value.error.code }); return value; } };
  return {
    loginStatus: () => call('login.status', async () => ({ ...(await adapter.loginStatus()), checkedAt: new Date().toISOString() })),
    loginStart: (args = {}) => call('login.start', () => adapter.beginLogin({ surface: args.surface || 'creator_center' })),
    sessionStatus: () => call('session.status', async () => ({ ...(await adapter.loginStatus()), checkedAt: new Date().toISOString() })),
    sessionClear: (args = {}) => args.confirm === true ? call('session.clear', () => adapter.clearSession()) : Promise.resolve({ status: 'blocked', error: { code: 'CONFIRMATION_REQUIRED', message: 'set confirm=true to clear the local browser session' } }),
    works: (args = {}) => call('works.read', () => adapter.readWorks({ limit: Math.min(Number(args.limit) || 20, 50) })),
    comments: (args = {}) => call('comments.read', () => adapter.readComments({ workRef: args.workRef, limit: Math.min(Number(args.limit) || 20, 50) })),
    analytics: (args = {}) => call('analytics.read', () => adapter.readAnalytics({ range: args.range || 'recent' })),
    interpret: (args = {}) => call('video.interpret', async () => { const source = validateSource(args.source, config); const mode = validateMode(args.mode, config); validateBounds(args, config); const captured = await adapter.readVideo({ ...source, maxSeconds: args.maxSeconds, focus: args.focus }); const report = { resultId: resultId(), mode, status: captured.status || 'complete', sourceHash: hashRef(source.canonical), observed: redact(captured.observed || captured, config.privacy), findings: redact(captured.findings || [], config.privacy), gaps: captured.gaps || [], provenance: captured.provenance || [{ source: source.kind, status: 'observed' }], privacy: privacySummary() }; const stored = await storage.save(report); return { ...report, persisted: stored.persisted }; }),
    detail: async (args = {}) => { const item = await storage.get(args.resultId); return item || { status: 'blocked', error: { code: 'NOT_FOUND', message: 'interpretation result not found' } }; }
  };
}
export { AdapterError, PolicyError };
