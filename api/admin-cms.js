// GARAGE ONE — CMS API для админки.
// На Vercel задать переменные окружения: ADMIN_PASSWORD, GITHUB_TOKEN.
// CMS_REPO — 'owner/repo' проекта на GitHub (поменять ниже или задать переменной).
const ADMIN_PW = process.env.ADMIN_PASSWORD || 'test';
const REPO = process.env.CMS_REPO || 'toneplaceconnect-afk/garage-one';
const BRANCH = 'main';

export default async function handler(request, response) {
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (request.method === 'OPTIONS') { response.status(204).end(); return; }

  try {
    const u = new URL(request.url, 'https://x');
    const action = u.searchParams.get('action') || '';

    let body = {};
    if (request.method === 'POST') {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString();
      if (raw) body = JSON.parse(raw);
    }

    const pw = String(body.password || '');
    const auth = request.headers.authorization || '';
    const bearer = auth.replace(/^Bearer\s+/i, '').trim();

    if (action === 'auth' && request.method === 'POST') {
      if (pw !== ADMIN_PW) { response.status(401).json({ error: 'wrong password' }); return; }
      response.status(200).json({ ok: true, token: pw });
      return;
    }

    if (bearer !== ADMIN_PW) { response.status(401).json({ error: 'unauth' }); return; }

    if (action === 'content' && request.method === 'GET') {
      const ghRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/content.json', {
        headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github.v3+json' }
      });
      if (!ghRes.ok) { response.status(502).json({ error: 'GitHub ' + ghRes.status }); return; }
      const file = await ghRes.json();
      const content = JSON.parse(Buffer.from(file.content, 'base64').toString());
      response.status(200).json({ ok: true, content, sha: file.sha });
      return;
    }

    if (action === 'save' && request.method === 'POST') {
      const content = body.content;
      const sha = body.sha;
      if (!content || !sha) { response.status(400).json({ error: 'missing content/sha' }); return; }
      const ghRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/content.json', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'CMS update', content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'), sha, branch: BRANCH })
      });
      if (!ghRes.ok) { const e = await ghRes.text(); response.status(502).json({ error: 'GitHub ' + ghRes.status, detail: e }); return; }
      const result = await ghRes.json();
      response.status(200).json({ ok: true, sha: result.content.sha });
      return;
    }

    if (action === 'upload' && request.method === 'POST') {
      const { filename, data } = body;
      if (!filename || !data) { response.status(400).json({ error: 'missing filename/data' }); return; }
      const safeName = 'upload-' + Date.now() + '-' + filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const ghRes = await fetch('https://api.github.com/repos/' + REPO + '/contents/assets/uploads/' + safeName, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Upload ' + filename, content: data, branch: BRANCH })
      });
      if (!ghRes.ok) { const e = await ghRes.text(); response.status(502).json({ error: 'GitHub ' + ghRes.status, detail: e }); return; }
      const result = await ghRes.json();
      response.status(200).json({ ok: true, url: result.content.download_url, sha: result.content.sha });
      return;
    }

    response.status(200).json({ ok: true, action });
  } catch (e) {
    response.status(500).json({ error: e.message });
  }
}
