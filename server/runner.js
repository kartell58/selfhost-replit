import { spawn } from 'child_process';
import net from 'net';
import path from 'path';
import { projectPath, detectRunCommand, getProject } from './projects.js';
import { updateProject } from './projects.js';

const processes = new Map(); // projectId -> { proc, port, clients: Set, logs: string[] }

function getState(id) {
  if (!processes.has(id)) processes.set(id, { proc: null, port: null, clients: new Set(), logs: [] });
  return processes.get(id);
}

export function attachClient(projectId, ws, kind = 'run') {
  const st = getState(projectId);
  const client = { ws, kind };
  st.clients.add(client);
  ws.on('close', () => st.clients.delete(client));
  if (st.logs.length) {
    ws.send(JSON.stringify({ type: 'history', data: st.logs.slice(-200).join('') }));
  }
  ws.send(JSON.stringify({ type: 'status', running: !!st.proc, port: st.port }));
  return client;
}

function broadcast(projectId, msg) {
  const st = getState(projectId);
  const payload = JSON.stringify(msg);
  for (const c of st.clients) {
    if (c.ws.readyState === 1) c.ws.send(payload);
  }
}

function pushLog(projectId, chunk) {
  const st = getState(projectId);
  const text = chunk.toString();
  st.logs.push(text);
  if (st.logs.length > 500) st.logs.splice(0, st.logs.length - 500);
  broadcast(projectId, { type: 'output', data: text });
}

async function findFreePort(start = 3100, end = 3999) {
  for (let p = start; p <= end; p++) {
    // eslint-disable-next-line no-await-in-loop
    const free = await new Promise((resolve) => {
      const s = net.createServer();
      s.once('error', () => resolve(false));
      s.once('listening', () => s.close(() => resolve(true)));
      s.listen(p, '127.0.0.1');
    });
    if (free) return p;
  }
  return 3000 + Math.floor(Math.random() * 1000);
}

export async function runProject(projectId) {
  const project = getProject(projectId);
  if (!project) throw new Error('Project not found');
  const st = getState(projectId);
  if (st.proc) throw new Error('Already running');
  const cmdStr = detectRunCommand(projectId);
  if (!cmdStr) throw new Error('No run command configured');

  const port = await findFreePort();
  st.port = port;
  st.logs = [];
  const cwd = projectPath(projectId);
  pushLog(projectId, `\r\n\x1b[36m$ ${cmdStr}\x1b[0m\r\n`);
  const proc = spawn('bash', ['-lc', cmdStr], {
    cwd,
    env: { ...process.env, PORT: String(port), HOST: '0.0.0.0' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  st.proc = proc;
  updateProject(projectId, { lastPort: port });
  broadcast(projectId, { type: 'status', running: true, port });

  proc.stdout.on('data', (d) => pushLog(projectId, d));
  proc.stderr.on('data', (d) => pushLog(projectId, d));
  proc.on('error', (err) => {
    pushLog(projectId, `\r\n\x1b[31mProcess error: ${err.message}\x1b[0m\r\n`);
  });
  proc.on('close', (code, signal) => {
    pushLog(projectId, `\r\n\x1b[33mProcess exited (code=${code}, signal=${signal})\x1b[0m\r\n`);
    st.proc = null;
    broadcast(projectId, { type: 'status', running: false, port: st.port, code, signal });
  });
  return { port };
}

export function stopProject(projectId) {
  const st = getState(projectId);
  if (!st.proc) return false;
  try {
    st.proc.kill('SIGTERM');
    setTimeout(() => {
      if (st.proc) try { st.proc.kill('SIGKILL'); } catch {}
    }, 1500);
  } catch {}
  return true;
}

export function writeInput(projectId, data) {
  const st = getState(projectId);
  if (st.proc && st.proc.stdin.writable) {
    st.proc.stdin.write(data);
    return true;
  }
  return false;
}

export function getRunInfo(projectId) {
  const st = getState(projectId);
  return { running: !!st.proc, port: st.port };
}
