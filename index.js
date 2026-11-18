import { createDyService } from './lib/service.js';
export const inject = ['tools'];
export const Config = { type: 'object', additionalProperties: false, properties: { schemaVersion: { type: 'integer', minimum: 1 }, workspaceRoot: { type: 'string' }, readOnly: { type: 'boolean' }, dryRun: { type: 'boolean' }, channel: { type: 'object', additionalProperties: true }, interpretation: { type: 'object', additionalProperties: true }, privacy: { type: 'object', additionalProperties: true }, features: { type: 'object', additionalProperties: true } } };
const output = { schema: { type: 'object', additionalProperties: true }, render: (_args, value) => value };
const tool = (name, description, properties, execute) => ({ name, description, parameters: { type: 'object', properties, additionalProperties: false }, output, execute });
export function apply(ctx, config = {}) {
  const service = createDyService(config, { audit: (event) => ctx.logger?.debug?.(`[douyin-research] ${event.action} ${event.result}`) }); const tools = ctx.get?.('tools') || ctx.tools;
  if (!tools?.register) throw new Error('douyin-research requires the Host tools service');
  const defs = [
    tool('dy_login_status', 'Check whether an authorized Douyin browser session is ready. Never returns secrets.', { detail: { type: 'boolean' } }, () => service.loginStatus()),
    tool('dy_login_start', 'Start the user-led Douyin login flow. The user completes login in the browser.', { surface: { type: 'string', enum: ['creator_center', 'public_site'] } }, (args) => service.loginStart(args)),
    tool('dy_session_status', 'Verify the currently signed-in Douyin account and capabilities.', {}, () => service.sessionStatus()),
    tool('dy_session_clear', 'Clear the local Douyin browser session after explicit confirmation.', { confirm: { type: 'boolean' } }, (args) => service.sessionClear(args)),
    tool('dy_works', 'Read works visible to the authorized account or public page.', { limit: { type: 'integer', minimum: 1, maximum: 50 } }, (args) => service.works(args)),
    tool('dy_comments', 'Read a bounded sample of comments for a visible work.', { workRef: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 50 } }, (args) => service.comments(args)),
    tool('dy_analytics', 'Read available account or work analytics without changing anything.', { range: { type: 'string' } }, (args) => service.analytics(args)),
    tool('dy_video_interpret', 'Interpret one authorized or public Douyin video in simple or full mode with evidence boundaries.', { source: { type: 'object', properties: { url: { type: 'string' }, file: { type: 'string' } }, additionalProperties: false }, mode: { type: 'string', enum: ['simple', 'full'] }, focus: { type: 'array', items: { type: 'string', enum: ['hook', 'story', 'visual', 'audio', 'cta', 'comments'] } }, maxSeconds: { type: 'number' } }, (args) => service.interpret(args)),
    tool('dy_interpret_detail', 'Retrieve a previously persisted redacted interpretation by result ID.', { resultId: { type: 'string' } }, (args) => service.detail(args))
  ];
  const disposers = defs.map((definition) => tools.register(definition)); const cleanup = () => disposers.forEach((dispose) => dispose?.()); if (ctx.effect) ctx.effect(cleanup); else return cleanup;
}
export { createDyService } from './lib/service.js';
