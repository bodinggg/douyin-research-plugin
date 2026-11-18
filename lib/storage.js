import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
export function createStorage(config = {}) {
  const root = config.workspaceRoot ? path.resolve(config.workspaceRoot) : null;
  const dir = root ? path.join(root, '.dsh-douyin-research', 'interpretations') : null;
  return {
    async save(result) {
      if (config.interpretation?.persist !== true || !dir) return { persisted: false };
      await fs.mkdir(dir, { recursive: true }); const id = result.resultId || crypto.randomUUID();
      await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify({ ...result, resultId: id, privacy: { redacted: true, rawStored: false } }, null, 2) + '\n', { mode: 0o600 }); return { persisted: true, resultId: id };
    },
    async get(resultId) { if (!dir || !/^[a-zA-Z0-9_-]+$/.test(resultId)) return null; try { return JSON.parse(await fs.readFile(path.join(dir, `${resultId}.json`), 'utf8')); } catch { return null; } }
  };
}
