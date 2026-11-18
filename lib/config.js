import Schema from '@deepseek-ai/schemastery';
const object = (properties) => ({ type: 'object', additionalProperties: false, properties });
export const configJsonSchema = object({
  schemaVersion: { type: 'integer', minimum: 1, maximum: 1 },
  workspaceRoot: { type: 'string' },
  readOnly: { type: 'boolean', const: true },
  dryRun: { type: 'boolean' },
  channel: object({ adapter: { type: 'string', enum: ['ego-browser', 'creator-center'] }, baseUrl: { type: 'string', enum: ['https://www.douyin.com', 'https://creator.douyin.com'] }, executable: { type: 'string' }, timeoutMs: { type: 'integer', minimum: 1000, maximum: 120000 } }),
  interpretation: object({ defaultMode: { type: 'string', enum: ['simple', 'full'] }, maxDurationSec: { type: 'integer', minimum: 1, maximum: 600 }, maxBatch: { type: 'integer', minimum: 1, maximum: 3 }, persist: { type: 'boolean' }, allowLocalFiles: { type: 'boolean', const: false } }),
  privacy: object({ storeRaw: { type: 'boolean', const: false }, storeFrames: { type: 'boolean', const: false }, redactUserNames: { type: 'boolean' }, hashIds: { type: 'boolean' } }),
  features: object({ fullInterpretation: { type: 'boolean' } }),
});
function validate(value, schema, path, issues) {
  const type = schema.type;
  if (type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) { issues.push({ message: 'Expected object', path }); return; }
    for (const [key, item] of Object.entries(value)) {
      const child = schema.properties[key];
      if (!child) issues.push({ message: `Unknown configuration key: ${key}`, path: [...path, key] });
      else validate(item, child, [...path, key], issues);
    }
    return;
  }
  if (type === 'integer' ? !Number.isInteger(value) : typeof value !== type) { issues.push({ message: `Expected ${type}`, path }); return; }
  if (schema.enum && !schema.enum.includes(value)) issues.push({ message: 'Unsupported value', path });
  if ('const' in schema && value !== schema.const) issues.push({ message: `Must equal ${schema.const}`, path });
  if (schema.minimum !== undefined && value < schema.minimum || schema.maximum !== undefined && value > schema.maximum) issues.push({ message: 'Value outside allowed range', path });
}
function form(schema) {
  if (schema.type === 'object') return Schema.object(Object.fromEntries(Object.entries(schema.properties).map(([key, child]) => [key, form(child)])));
  if ('const' in schema) return Schema.const(schema.const);
  if (schema.enum) return Schema.union(schema.enum.map(value => Schema.const(value)));
  let node = schema.type === 'string' ? Schema.string() : schema.type === 'boolean' ? Schema.boolean() : Schema.number();
  if (schema.type === 'integer') node = node.step(1);
  if (schema.minimum !== undefined) node = node.min(schema.minimum);
  if (schema.maximum !== undefined) node = node.max(schema.maximum);
  return node;
}
export const Config = form(configJsonSchema);
const standard = Config['~standard'];
Object.defineProperty(Config, '~standard', { value: { ...standard, validate(value) { const issues = []; validate(value, configJsonSchema, [], issues); return issues.length ? { issues } : standard.validate(value); } } });
