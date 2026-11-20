const json = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
};

export const api = {
  templates: () => fetch('/api/templates').then(json),
  projects: () => fetch('/api/projects').then(json),
  project: (id) => fetch(`/api/projects/${id}`).then(json),
  createProject: (body) => fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(json),
  updateProject: (id, body) => fetch(`/api/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(json),
  deleteProject: (id) => fetch(`/api/projects/${id}`, { method: 'DELETE' }).then(json),
  files: (id, path = '') => fetch(`/api/projects/${id}/files?path=${encodeURIComponent(path)}`).then(json),
  readFile: (id, path) => fetch(`/api/projects/${id}/file?path=${encodeURIComponent(path)}`).then(json),
  writeFile: (id, path, content) => fetch(`/api/projects/${id}/file`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, content }) }).then(json),
  mkdir: (id, path) => fetch(`/api/projects/${id}/mkdir`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) }).then(json),
  removePath: (id, path) => fetch(`/api/projects/${id}/file?path=${encodeURIComponent(path)}`, { method: 'DELETE' }).then(json),
  renamePath: (id, from, to) => fetch(`/api/projects/${id}/rename`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to }) }).then(json),
  run: (id) => fetch(`/api/projects/${id}/run`, { method: 'POST' }).then(json),
  stop: (id) => fetch(`/api/projects/${id}/stop`, { method: 'POST' }).then(json),
  runInfo: (id) => fetch(`/api/projects/${id}/run-info`).then(json),
};
