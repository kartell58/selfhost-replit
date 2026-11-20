import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'db.json');

function ensure() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ projects: [] }, null, 2));
  }
}

export function readDb() {
  ensure();
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

export function writeDb(db) {
  ensure();
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

export function getProject(id) {
  return readDb().projects.find((p) => p.id === id);
}

export function upsertProject(project) {
  const db = readDb();
  const idx = db.projects.findIndex((p) => p.id === project.id);
  if (idx >= 0) db.projects[idx] = project;
  else db.projects.push(project);
  writeDb(db);
  return project;
}

export function deleteProject(id) {
  const db = readDb();
  db.projects = db.projects.filter((p) => p.id !== id);
  writeDb(db);
}
