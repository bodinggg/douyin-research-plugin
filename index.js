import { createDyService } from './lib/service.js';
export const inject = ['tools'];
export { Config } from './lib/config.js';
const output = { schema: { type: 'object', additionalProperties: true }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
const tool = (name, description, properties, execute) => ({ name, description, parameters: { type: 'object', properties, required: ['workRef', 'source', 'resultId'].filter(key => key in properties), additionalProperties: false }, output, execute });
export function apply(ctx, config = {}) {
  const service = createDyService(config, { audit: (event) => ctx.logger?.debug?.(`[douyin-research] ${event.action} ${event.result}`) }); const tools = ctx.get?.('tools') || ctx.tools;
  if (!tools?.register) throw new Error('douyin-research requires the Host tools service');
  const defs = [
    tool('dy_login_status', 'Check whether an authorized Douyin browser session is ready. Never returns secrets.', { detail: { type: 'boolean' } }, () => service.loginStatus()),
    tool('dy_login_start', 'Open Douyin login in Ego Lite and give the user browser control. Ask the user to return control in Ego Lite after login.', { surface: { type: 'string', enum: ['creator_center', 'public_site'] } }, (args) => service.loginStart(args)),
    tool('dy_session_status', 'Verify the currently signed-in Douyin account and capabilities.', {}, () => service.sessionStatus()),
    tool('dy_session_clear', 'Disconnect this plugin browser task after confirmation. Your shared browser remains logged in.', { confirm: { type: 'boolean' } }, (args) => service.sessionClear(args)),
    tool('dy_works', 'Read a bounded visible sample of the signed-in account’s own works. Returns workRef handles for comments.', { limit: { type: 'integer', minimum: 1, maximum: 50 } }, (args) => service.works(args)),
    tool('dy_following', 'Read a bounded visible sample of the signed-in account following list. Names are redacted by default; mutual friendship is not inferred.', { limit: { type: 'integer', minimum: 1, maximum: 50 } }, (args) => service.following(args)),
    tool('dy_comments', 'Read a bounded sample of comments for a visible work.', { workRef: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 50 } }, (args) => service.comments(args)),
    tool('dy_analytics', 'Read available account or work analytics without changing anything.', { range: { type: 'string' } }, (args) => service.analytics(args)),
    tool('dy_video_interpret', 'Read visible metadata for one Douyin video and return evidence gaps. Does not analyze video frames or audio; full mode is unavailable.', { source: { type: 'object', properties: { url: { type: 'string' }, file: { type: 'string' } }, additionalProperties: false }, mode: { type: 'string', enum: ['simple', 'full'] }, focus: { type: 'array', items: { type: 'string', enum: ['hook', 'story', 'visual', 'audio', 'cta', 'comments'] } }, maxSeconds: { type: 'number' } }, (args) => service.interpret(args)),
    tool('dy_interpret_detail', 'Retrieve a previously persisted redacted interpretation by result ID.', { resultId: { type: 'string' } }, (args) => service.detail(args))
  ];
  const disposers = [];
  try { for (const definition of defs) disposers.push(tools.register(definition)); }
  catch (error) { for (const dispose of disposers.reverse()) dispose(); throw error; }
  const cleanup = () => { service.dispose(); disposers.reverse().splice(0).forEach(dispose => dispose()); };
  if (ctx.effect) ctx.effect(() => cleanup); else return cleanup;
}
export { createDyService } from './lib/service.js';
