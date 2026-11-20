import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import { readDb, upsertProject, deleteProject, getProject } from './db.js';
export { getProject }; 
import { templates } from './templates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const projectsDir = path.join(root, 'projects');

export function ensureProjectsDir() {
  if (!fs.existsSync(projectsDir)) fs.mkdirSync(projectsDir, { recursive: true });
}

export function projectPath(id) {
  return path.join(projectsDir, id);
}

export function safeJoin(base, target = '') {
  const resolved = path.resolve(base, target);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new Error('Invalid path');
  }
  return resolved;
}

export function listProjects() {
  return readDb().projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function createProject({ name, template = 'node', isPublic = true }) {
  ensureProjectsDir();
  const t = templates[template] || templates.node;
  const id = nanoid(10);
  const now = Date.now();
  const dir = projectPath(id);
  fs.mkdirSync(dir, { recursive: true });
  for (const [file, content] of Object.entries(t.files)) {
    const full = path.join(dir, file);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  const project = {
    id,
    name: name?.trim() || `Untitled ${t.name}`,
    template,
    run: t.run,
    isPublic: !!isPublic,
    createdAt: now,
    updatedAt: now,
  };
  upsertProject(project);
  return project;
}

export function updateProject(id, patch) {
  const p = getProject(id);
  if (!p) return null;
  const next = { ...p, ...patch, id: p.id, updatedAt: Date.now() };
  upsertProject(next);
  return next;
}

export function removeProject(id) {
  const dir = projectPath(id);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  deleteProject(id);
}

export function listFiles(id, rel = '') {
  const base = projectPath(id);
  const dir = safeJoin(base, rel);
  if (!fs.existsSync(dir)) throw new Error('Not found');
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .map((e) => ({
      name: e.name,
      path: path.posix.join(rel.replace(/\\/g, '/'), e.name),
      type: e.isDirectory() ? 'dir' : 'file',
    }))
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
}

export function readFile(id, rel) {
  const base = projectPath(id);
  const full = safeJoin(base, rel);
  if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) throw new Error('Not found');
  return fs.readFileSync(full, 'utf8');
}

export function writeFile(id, rel, content) {
  const base = projectPath(id);
  const full = safeJoin(base, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content ?? '');
  const p = getProject(id);
  if (p) upsertProject({ ...p, updatedAt: Date.now() });
}

export function makeDir(id, rel) {
  const base = projectPath(id);
  const full = safeJoin(base, rel);
  fs.mkdirSync(full, { recursive: true });
}

export function removePath(id, rel) {
  const base = projectPath(id);
  const full = safeJoin(base, rel);
  if (!fs.existsSync(full)) return;
  fs.rmSync(full, { recursive: true, force: true });
}

export function renamePath(id, fromRel, toRel) {
  const base = projectPath(id);
  const from = safeJoin(base, fromRel);
  const to = safeJoin(base, toRel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
}

export function detectRunCommand(id) {
  const p = getProject(id);
  if (!p) return null;
  const base = projectPath(id);
  const replitFile = path.join(base, '.replit');
  if (fs.existsSync(replitFile)) {
    const txt = fs.readFileSync(replitFile, 'utf8');
    const m = txt.match(/run\s*=\s*"([^"]+)"/);
    if (m) return m[1];
  }
  return p.run || null;
}
