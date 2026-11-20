import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, FolderPlus, RefreshCw, Trash2 } from 'lucide-react';

function Node({ projectId, node, depth, onOpenFile, activePath, refreshKey, onRefresh }) {
  const [open, setOpen] = useState(depth === 0);
  const [children, setChildren] = useState(null);
  const isDir = node.type === 'dir';

  const load = async () => {
    if (!isDir) return;
    try {
      const list = await api.files(projectId, node.path);
      setChildren(list);
    } catch { setChildren([]); }
  };

  useEffect(() => { if (open) load(); }, [open, node.path, refreshKey]);

  const click = () => {
    if (isDir) setOpen(o => !o);
    else onOpenFile(node.path);
  };

  const del = async (e) => {
    e.stopPropagation();
    if (!confirm(`Excluir ${node.path}?`)) return;
    await api.removePath(projectId, node.path);
    onRefresh();
  };

  return (
    <div>
      <div className={`tree-item ${activePath === node.path ? 'active' : ''}`} style={{ paddingLeft: 8 + depth * 12 }} onClick={click}>
        {isDir ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span style={{ width: 14 }} />}
        {isDir ? (open ? <FolderOpen size={15} color="#7aa2f7" /> : <Folder size={15} color="#7aa2f7" />) : <File size={15} />}
        <span className="name">{node.name}</span>
        <span style={{ flex: 1 }} />
        {depth > 0 && <Trash2 size={13} className="node-del" onClick={del} style={{ opacity: 0.4 }} />}
      </div>
      {isDir && open && children && children.map(ch => (
        <Node key={ch.path} projectId={projectId} node={ch} depth={depth + 1} onOpenFile={onOpenFile} activePath={activePath} refreshKey={refreshKey} onRefresh={onRefresh} />
      ))}
    </div>
  );
}

export default function FileTree({ projectId, onOpenFile, activePath }) {
  const [roots, setRoots] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(k => k + 1);

  const load = async () => {
    try { setRoots(await api.files(projectId, '')); } catch { setRoots([]); }
  };
  useEffect(() => { load(); }, [projectId, refreshKey]);

  const addFile = async () => {
    const name = prompt('Nome do arquivo (ex: src/app.js):');
    if (!name) return;
    await api.writeFile(projectId, name, '');
    refresh();
    onOpenFile(name);
  };
  const addFolder = async () => {
    const name = prompt('Nome da pasta:');
    if (!name) return;
    await api.mkdir(projectId, name);
    refresh();
  };

  return (
    <div className="pane" style={{ borderRight: '1px solid var(--border)' }}>
      <div className="pane-header">
        <span>Files</span>
        <div className="actions">
          <button className="icon-btn" title="Novo arquivo" onClick={addFile}><Plus size={14} /></button>
          <button className="icon-btn" title="Nova pasta" onClick={addFolder}><FolderPlus size={14} /></button>
          <button className="icon-btn" title="Atualizar" onClick={refresh}><RefreshCw size={14} /></button>
        </div>
      </div>
      <div className="pane-body file-tree">
        {roots.length === 0 && <div className="muted">Sem arquivos</div>}
        {roots.map(n => (
          <Node key={n.path} projectId={projectId} node={n} depth={0} onOpenFile={onOpenFile} activePath={activePath} refreshKey={refreshKey} onRefresh={refresh} />
        ))}
      </div>
    </div>
  );
}
