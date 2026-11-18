import { runBrowser } from './browser.js';
import { hashRef } from './privacy.js';
import { validateSource } from './policy.js';
export class AdapterError extends Error { constructor(code, message) { super(message); this.code = code; } }
export function createAdapter(config = {}, dependencies = {}) {
  const controller = new AbortController();
  const run = dependencies.runBrowser || ((op, input) => runBrowser(op, input, config, controller.signal));
  let spaceId = null;
  let accountHash = null;
  let queue = Promise.resolve();
  const refs = new Map();
  const execute = (op, input = {}) => {
    const next = queue.then(async () => {
      if (controller.signal.aborted) throw new AdapterError('PLUGIN_STOPPED', 'Plugin has been unloaded.');
      let result;
      try { result = await run(op, { ...input, spaceId }); }
      catch (error) {
        if (error.spaceId) spaceId = error.spaceId;
        if (error.code === 'TASK_EXPIRED') { spaceId = null; accountHash = null; refs.clear(); }
        throw error;
      }
      if (controller.signal.aborted) throw new AdapterError('PLUGIN_STOPPED', 'Plugin has been unloaded.');
      if (result.spaceId) spaceId = result.spaceId;
      if (result.status === 'awaiting_user') return result;
      if (result.observed?.accountName) {
        const identity = hashRef(result.observed.accountName);
        if (accountHash && accountHash !== identity) throw new AdapterError('ACCOUNT_MISMATCH', 'The visible account changed. Disconnect this plugin session before continuing.');
        accountHash = identity;
      }
      if (result.observed?.loginRequired) throw new AdapterError('LOGIN_REQUIRED', 'Complete login in the browser before continuing.');
      return result;
    });
    queue = next.catch(() => {});
    return next;
  };
  const remember = url => { const source = validateSource({ url }, config); const ref = hashRef(source.canonical); refs.set(ref, source.canonical); return ref; };
  const capabilities = { browserBridge: true, works: true, comments: 'visible_sample', video: 'metadata_only', analytics: false, logout: false };
  return {
    dispose() { controller.abort(); refs.clear(); },
    async loginStatus() {
      const result = await execute('status');
      if (result.status === 'awaiting_user') return { ...result, capabilities };
      return { state: result.observed.loggedIn ? 'ready' : 'unknown', accountRef: accountHash, capabilities, ...(result.observed.loggedIn ? {} : { instructions: 'Use dy_login_start to open the user-led login flow.' }) };
    },
    beginLogin({ surface }) { return execute('start', { url: surface === 'creator_center' ? 'https://creator.douyin.com/' : 'https://www.douyin.com/user/self' }); },
    async clearSession() { if (spaceId) { const result = await execute('disconnect'); if (result.status === 'awaiting_user') return result; } spaceId = null; accountHash = null; refs.clear(); return { status: 'disconnected', loggedOut: false, message: 'Plugin task closed; your shared browser login was not cleared.' }; },
    async readWorks({ limit }) {
      const result = await execute('works', { limit });
      if (result.status === 'awaiting_user') return result;
      if (!result.observed.loggedIn) throw new AdapterError('LOGIN_REQUIRED', 'Could not verify the signed-in account on its works page.');
      if (!result.observed.items.length && !result.observed.endObserved) throw new AdapterError('PAGE_NOT_READY', 'The works list did not finish loading. No empty-list conclusion was made.');
      return { status: 'ok', accountRef: accountHash, items: result.observed.items.map(item => ({ workRef: remember(item.url), description: item.description, visibleText: item.text })), sampling: 'visible', hasMore: !result.observed.endObserved, observedCount: result.observed.items.length };
    },
    async readFollowing({ limit }) {
      const result = await execute('following', { limit });
      if (result.status === 'awaiting_user') return result;
      if (!result.observed.loggedIn) throw new AdapterError('LOGIN_REQUIRED', 'Could not verify the signed-in account on its following page.');
      return { status: 'partial', items: result.observed.items.map(item => ({ accountRef: hashRef(item.reference), name: config.privacy?.redactUserNames === false ? item.name : '[redacted]' })), sampling: 'visible', observedCount: result.observed.items.length, gaps: ['Visible following-list sample only; mutual friendship is not inferred.'] };
    },
    async readComments({ workRef, limit }) {
      const url = refs.get(workRef);
      if (!url) throw new AdapterError('INVALID_WORK_REF', 'Use a workRef returned by dy_works in this plugin session.');
      const result = await execute('comments', { url, limit });
      if (result.status === 'awaiting_user') return result;
      if (result.observed.renderedCommentCount > 0 && !result.observed.comments.length) throw new AdapterError('COMMENT_LAYOUT_UNSUPPORTED', 'Comments are rendered but their body layout is not recognized. No empty-list conclusion was made.');
      return { status: 'partial', items: result.observed.comments, sampling: 'visible', observedCount: result.observed.comments.length, gaps: ['Only currently rendered comments are sampled; an empty sample does not establish that no comments exist.'] };
    },
    async readAnalytics() { throw new AdapterError('CAPABILITY_UNAVAILABLE', 'Account analytics are not implemented. Visible work metrics may be available through dy_works.'); },
    async readVideo({ kind, canonical }) {
      if (kind !== 'url') throw new AdapterError('LOCAL_FILE_DISABLED', 'This browser adapter supports Douyin HTTPS video URLs only.');
      const result = await execute('video', { url: canonical });
      if (result.status === 'awaiting_user') return result;
      if (!result.observed.videoPresent && !result.observed.captions?.length) throw new AdapterError('VIDEO_UNAVAILABLE', 'The requested video did not expose a player or description. It may be unavailable or blocked.');
      remember(canonical);
      const { comments, renderedCommentCount, loginRequired, ...observed } = result.observed;
      return { status: 'partial', observed, findings: [], gaps: ['Metadata-only browser observation. Video frames and audio have not been analyzed; visual, audio and full-story claims cannot be established.'], provenance: [{ source: 'visible_browser_dom', status: 'observed' }] };
    },
  };
}
