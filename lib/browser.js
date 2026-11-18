import { spawn } from 'node:child_process';

export class BrowserError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

// All browser code is authored here. Callers supply data, never executable code.
export function runBrowser(operation, input = {}, config = {}, signal) {
  const executable = config.channel?.executable || 'ego-browser';
  const timeout = config.channel?.timeoutMs || 45000;
  const script = `const input = ${JSON.stringify(input)};\nconst operation = ${JSON.stringify(operation)};\n${browserProgram.toString()}\ntry { console.log('DY_RESULT:' + JSON.stringify(await browserProgram(operation,input))); } catch(error) { console.log('DY_RESULT:' + JSON.stringify({error:{code:error.code || 'BROWSER_ERROR',message:String(error.message).slice(0,300)}})); }`;
  return new Promise((resolve, reject) => {
    const child = spawn(executable, ['nodejs'], { shell: false, signal, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = ''; let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (error) {
        const bound = output.split('\n').find(line => line.startsWith('DY_SPACE:'));
        if (bound && Number.isSafeInteger(Number(bound.slice(9)))) error.spaceId = Number(bound.slice(9));
        reject(error);
      } else resolve(value);
    };
    const timer = setTimeout(() => { child.kill('SIGTERM'); finish(new BrowserError('BROWSER_TIMEOUT', 'Browser operation timed out; inspect the existing Ego Lite task before retrying.')); }, timeout);
    const capture = chunk => { output += chunk.toString(); if (output.length > 2000000) { child.kill(); finish(new BrowserError('OUTPUT_TOO_LARGE', 'Browser output exceeded the limit.')); } };
    child.stdout.on('data', capture); child.stderr.on('data', capture);
    child.on('error', error => finish(new BrowserError(error.code === 'ENOENT' ? 'BROWSER_NOT_INSTALLED' : 'BROWSER_ERROR', 'Install and start Ego Lite with the ego-browser CLI available on PATH, or configure channel.executable.')));
    child.on('close', () => {
      const line = output.split('\n').find(line => line.startsWith('DY_RESULT:'));
      if (!line) return finish(new BrowserError('BROWSER_UNAVAILABLE', 'Ego Lite did not return a result. Check that Ego Lite is running and its CLI is connected.'));
      try { const value = JSON.parse(line.slice(10)); if (value.error) finish(new BrowserError(value.error.code, value.error.message)); else finish(null, value); } catch { finish(new BrowserError('BROWSER_PROTOCOL_ERROR', 'Invalid browser response.')); }
    });
    child.stdin.on('error', () => {});
    child.stdin.end(script);
  });
}

async function browserProgram(operation, input) {
  const allowed = url => { const u = new URL(url); if (u.protocol !== 'https:' || !['www.douyin.com','douyin.com','creator.douyin.com'].includes(u.hostname) || u.username || u.password) throw new Error('Unexpected browser origin'); return u; };
  let task;
  if (input.spaceId) {
    const entry = (await listTaskSpaces()).find(s => s.id === input.spaceId);
    if (!entry) return { error: { code: 'TASK_EXPIRED', message: 'Browser task no longer exists. Disconnect the plugin session, then retry.' } };
    if (entry.ownership !== 'agent') return { status: 'awaiting_user', state: 'user_control', spaceId: input.spaceId, instructions: 'Return browser control to the agent in Ego Lite before continuing.' };
    task = await taskSpace(input.spaceId);
  } else {
    task = await taskSpace('Douyin research plugin');
  }
  console.log('DY_SPACE:' + task.spaceId);
  const page = (await task.pages())[0];
  if (!page) throw new Error('Browser task has no managed page; inspect it in Ego Lite before retrying.');
  const base = { spaceId: task.spaceId };
  if (operation === 'start') {
    await page.goto(input.url);
    allowed(await page.url());
    await task.handOff();
    return { ...base, status: 'awaiting_user', state: 'login_required', instructions: 'Complete login in Ego Lite, then return browser control using Ego Lite and ask to check login status.' };
  }
  if (operation === 'disconnect') {
    await task.finish({ keep: [] });
    return { status: 'disconnected', state: 'unknown', loggedOut: false };
  }
  if (operation === 'status') await page.goto('https://www.douyin.com/user/self');
  if (operation === 'works' || operation === 'following') await page.goto('https://www.douyin.com/user/self');
  if (operation === 'video' || operation === 'comments') { allowed(input.url); await page.goto(input.url); }
  const actualUrl = allowed(await page.url());
  if ((operation === 'video' || operation === 'comments') && actualUrl.pathname !== new URL(input.url).pathname) throw new Error('Requested video redirected to a different page');
  // Wait for the SPA's visible content, with a bounded timeout. Never inspect cookies or internal application state.
  await page.waitForFunction(() => document.querySelector('a[href*="/video/"], video, h1, [data-e2e="user-info"]') || /扫码登录|验证码登录/.test(document.body.innerText), undefined, { timeout: 10000 }).catch(() => {});
  const gate = await page.evaluate(() => {
    const text = document.body.innerText;
    if (/拖动滑块|完成下方验证|请完成安全验证|访问过于频繁/.test(text)) return 'verification';
    if (/扫码登录|验证码登录|登录后即可/.test(text) && !/退出登录|搜索你发布的作品|私密作品/.test(text)) return 'login';
    return null;
  });
  if (gate) {
    await task.handOff();
    return { ...base, status: 'awaiting_user', state: gate === 'login' ? 'login_required' : 'verification_required', instructions: 'Complete the visible login or verification in Ego Lite, return browser control, then retry.' };
  }
  if (operation === 'video' || operation === 'comments') await page.waitForFunction(() => document.title && (document.querySelector('[data-e2e="video-desc"]') || Number.isFinite(document.querySelector('video')?.duration)), undefined, { timeout: 15000 }).catch(() => {});
  if (operation === 'works') await page.waitForFunction(() => document.querySelector('[data-e2e="user-post-list"] a[href*="/video/"]') || /暂时没有更多了|还没有发布作品|暂无作品/.test(document.body.innerText), undefined, { timeout: 15000 }).catch(() => {});
  if (operation === 'comments') await page.waitForFunction(() => { const list=document.querySelector('[data-e2e="comment-list"]'); return !!list && (!!list.querySelector('[data-e2e="comment-item"]') || /暂无评论|还没有评论/.test(list.innerText)); }, undefined, { timeout: 15000 });
  if (operation === 'following') {
    await page.waitForSelector('[data-e2e="user-info-follow"]', { state: 'visible', timeout: 10000 });
    await page.click('[data-e2e="user-info-follow"]');
    await page.waitForFunction(() => [...document.querySelectorAll('a[href*="/user/"]')].some(a => /\/user\/MS/.test(a.getAttribute('href') || '') && a.innerText.trim()), undefined, { timeout: 15000 });
  }
  const observed = await page.evaluate(({ operation, limit }) => {
    const visible = el => !!el && !!(el.getBoundingClientRect().width && el.getBoundingClientRect().height);
    const text = el => (el?.innerText || el?.textContent || '').trim().slice(0,1200);
    const body = document.body.innerText;
    const loggedIn = /退出登录|搜索你发布的作品|私密作品/.test(body);
    const loginRequired = /扫码登录|验证码登录|登录后即可/.test(body) && !loggedIn;
    const accountName = text(document.querySelector('[data-e2e="user-info"]')).match(/抖音号：?\s*([^\s]+)/)?.[1] || text(document.querySelector('h1'));
    if (operation === 'status') return { loggedIn, loginRequired, accountName };
    if (operation === 'following') {
      const items = [...new Map([...document.querySelectorAll('a[href*="/user/"]')].filter(a => visible(a) && /\/user\/MS/.test(a.getAttribute('href') || '') && text(a)).map(a => [a.href, { reference: a.href, name: text(a) }])).values()].slice(0,limit);
      return { loggedIn, loginRequired, accountName, items };
    }
    if (operation === 'works') {
      const container = document.querySelector('[data-e2e="user-post-list"]');
      const links = [...(container?.querySelectorAll('a[href*="/video/"]') || [])].filter(visible);
      const items = [...new Map(links.map(a => [a.href,{ url:a.href, text:text(a), description:text(a.querySelector('p')) }])).values()].slice(0,limit);
      return { loggedIn, loginRequired, accountName, items, endObserved: /暂时没有更多了|还没有发布作品|暂无作品/.test(body) && links.length <= limit };
    }
    const video = document.querySelector('video');
    const captions = [...document.querySelectorAll('[data-e2e="video-desc"], [data-e2e="video-title"], h1')].filter(visible).map(text).filter(Boolean).slice(0,5);
    const comments = operation === 'comments' ? [...document.querySelectorAll('[data-e2e="comment-list"] [data-e2e="comment-item"]')].filter(visible).slice(0,limit).map(el => ({ text:text(el.querySelector('[data-e2e="comment-item-content"], [data-e2e="comment-content"]') || el.querySelector('.comment-item-info-wrap')?.nextElementSibling) })).filter(item => item.text) : [];
    return { loginRequired, title:document.title.slice(0,400), captions, durationSeconds: video && Number.isFinite(video.duration) ? video.duration : null, videoPresent:!!video, comments, renderedCommentCount: operation === 'comments' ? [...document.querySelectorAll('[data-e2e="comment-list"] [data-e2e="comment-item"]')].filter(visible).length : 0 };
  }, { operation, limit: input.limit || 20 });
  return { ...base, status: 'ok', pageUrl: await page.url(), observed };
}
