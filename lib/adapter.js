export class AdapterError extends Error { constructor(code, message) { super(message); this.code = code; } }
export function createAdapter(config = {}) {
  const unavailable = () => { throw new AdapterError('NOT_CONNECTED', 'No browser bridge is configured'); };
  return {
    async loginStatus() { return { state: 'unknown', capabilities: { browserBridge: false } }; },
    beginLogin: unavailable, clearSession: unavailable, readWorks: unavailable, readComments: unavailable, readAnalytics: unavailable, readVideo: unavailable, config
  };
}
