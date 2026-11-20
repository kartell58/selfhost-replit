import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import {
  ensureProjectsDir, listProjects, createProject, getProject, updateProject, removeProject,
  listFiles, readFile, writeFile, makeDir, removePath, renamePath, projectPath,
} from './projects.js';
import { templates } from './templates.js';
import { attachClient, runProject, stopProject, writeInput, getRunInfo } from './runner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const clientDist = path.join(root, 'client', 'dist');

ensureProjectsDir();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/templates', (req, res) => {
  res.json(Object.entries(templates).map(([id, t]) => ({ id, name: t.name, run: t.run })));
});

app.get('/api/projects', (req, res) => {
  const projects = listProjects().map((p) => ({ ...p, ...getRunInfo(p.id) }));
  res.json(projects);
});

app.post('/api/projects', asyncHandler(async (req, res) => {
  const project = createProject(req.body || {});
  res.status(201).json(project);
}));

app.get('/api/projects/:id', (req, res) => {
  const p = getProject(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json({ ...p, ...getRunInfo(p.id) });
});

app.patch('/api/projects/:id', (req, res) => {
  const p = updateProject(req.params.id, req.body || {});
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

app.delete('/api/projects/:id', (req, res) => {
  stopProject(req.params.id);
  removeProject(req.params.id);
  res.json({ ok: true });
});

app.get('/api/projects/:id/files', (req, res) => {
  try {
    const files = listFiles(req.params.id, req.query.path || '');
    res.json(files);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/projects/:id/file', (req, res) => {
  try {
    const content = readFile(req.params.id, req.query.path);
    res.json({ path: req.query.path, content });
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

app.put('/api/projects/:id/file', (req, res) => {
  try {
    writeFile(req.params.id, req.body.path, req.body.content ?? '');
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/projects/:id/mkdir', (req, res) => {
  try {
    makeDir(req.params.id, req.body.path);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/projects/:id/rename', (req, res) => {
  try {
    renamePath(req.params.id, req.body.from, req.body.to);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/projects/:id/file', (req, res) => {
  try {
    removePath(req.params.id, req.query.path);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/projects/:id/run', asyncHandler(async (req, res) => {
  const info = await runProject(req.params.id);
  res.json({ ok: true, ...info });
}));

app.post('/api/projects/:id/stop', (req, res) => {
  const ok = stopProject(req.params.id);
  res.json({ ok });
});

app.get('/api/projects/:id/run-info', (req, res) => {
  res.json(getRunInfo(req.params.id));
});

// Simple HTTP proxy for preview: /preview/:id/... -> localhost:port/...
app.use('/preview/:id', (req, res) => {
  const info = getRunInfo(req.params.id);
  if (!info.running || !info.port) {
    return res.status(503).send('Aplicação não está rodando. Clique em Run.');
  }
  const proxyPath = req.url || '/';
  const options = {
    hostname: '127.0.0.1',
    port: info.port,
    path: proxyPath,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${info.port}` },
  };
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on('error', (err) => {
    if (!res.headersSent) res.status(502).send('Preview indisponível: ' + err.message);
  });
  req.pipe(proxyReq, { end: true });
});

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/preview') || req.path.startsWith('/ws')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal error' });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname !== '/ws') {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req, url);
  });
});

wss.on('connection', (ws, req, url) => {
  const projectId = url.searchParams.get('projectId');
  const type = url.searchParams.get('type') || 'run';
  if (!projectId || !getProject(projectId)) {
    ws.send(JSON.stringify({ type: 'error', error: 'Projeto inválido' }));
    ws.close();
    return;
  }

  if (type === 'run') {
    attachClient(projectId, ws, 'run');
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'input') writeInput(projectId, msg.data);
      } catch {}
    });
    return;
  }

  if (type === 'shell') {
    const cwd = projectPath(projectId);
    const shell = spawn('bash', ['-i'], {
      cwd,
      env: { ...process.env, TERM: 'xterm-256color' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const send = (data) => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'output', data: data.toString() }));
    };
    shell.stdout.on('data', send);
    shell.stderr.on('data', send);
    shell.on('close', (code) => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'exit', code }));
    });
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'input' && shell.stdin.writable) shell.stdin.write(msg.data);
        if (msg.type === 'resize') { /* no pty */ }
      } catch {
        if (shell.stdin.writable) shell.stdin.write(raw.toString());
      }
    });
    ws.on('close', () => {
      try { shell.kill('SIGTERM'); } catch {}
    });
    return;
  }

  ws.close();
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SelfHost Replit server listening on http://localhost:${PORT}`);
});
