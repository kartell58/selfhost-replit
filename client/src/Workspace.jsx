import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Allotment } from 'allotment';
import { Files, Search, GitBranch, Package, Settings, Home, Play, Square, Save, Globe, Lock } from 'lucide-react';
import { api } from './api.js';
import FileTree from './FileTree.jsx';
import EditorPane from './EditorPane.jsx';
import BottomPanel from './BottomPanel.jsx';

export default function Workspace({ projectId, onExit }) {
  const [project, setProject] = useState(null);
  const [activeView, setActiveView] = useState('files');
  const [tabs, setTabs] = useState([]); // {path, content, savedContent, dirty}
  const [activePath, setActivePath] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProject = useCallback(async () => {
    try {
      const p = await api.project(projectId);
      setProject(p);
    } catch (e) { setError(e.message); }
  }, [projectId]);

  useEffect(() => { loadProject(); }, [loadProject]);
  useEffect(() => {
    const t = setInterval(loadProject, 3000);
    return () => clearInterval(t);
  }, [loadProject]);

  const openFile = async (path) => {
    const existing = tabs.find(t => t.path === path);
    if (existing) { setActivePath(path); return; }
    try {
      const { content } = await api.readFile(projectId, path);
      setTabs(ts => [...ts, { path, content, savedContent: content, dirty: false }]);
      setActivePath(path);
    } catch (e) { setError(e.message); }
  };

  const closeTab = (path) => {
    const t = tabs.find(x => x.path === path);
    if (t && t.dirty && !confirm(`Descartar alterações em ${path}?`)) return;
    setTabs(ts => {
      const next = ts.filter(x => x.path !== path);
      if (activePath === path) setActivePath(next.length ? next[next.length - 1].path : null);
      return next;
    });
  };

  const changeTab = (path, content) => {
    setTabs(ts => ts.map(t => t.path === path ? { ...t, content, dirty: content !== t.savedContent } : t));
  };

  const saveTab = async (path) => {
    const t = tabs.find(x => x.path === path);
    if (!t) return;
    setSaving(true);
    try {
      await api.writeFile(projectId, path, t.content);
      setTabs(ts => ts.map(x => x.path === path ? { ...x, savedContent: x.content, dirty: false } : x));
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const saveAll = async () => {
    for (const t of tabs.filter(x => x.dirty)) {
      // eslint-disable-next-line no-await-in-loop
      await saveTab(t.path);
    }
  };

  const run = async () => {
    try { await saveAll(); await api.run(projectId); await loadProject(); }
    catch (e) { setError(e.message); }
  };
  const stop = async () => {
    try { await api.stop(projectId); await loadProject(); }
    catch (e) { setError(e.message); }
  };

  const togglePublic = async () => {
    if (!project) return;
    try { await api.updateProject(projectId, { isPublic: !project.isPublic }); await loadProject(); }
    catch (e) { setError(e.message); }
  };

  if (error && !project) {
    return <div style={{ padding: 24, color: 'var(--red)' }}>Erro: {error} <button className="btn" onClick={onExit}>Voltar</button></div>;
  }
  if (!project) {
    return <div style={{ padding: 24, color: 'var(--text-dim)' }}>Carregando workspace...</div>;
  }

  const dirtyCount = tabs.filter(t => t.dirty).length;

  return (
    <div className="workspace">
      <div className="topbar">
        <div className="topbar-left">
          <button className="icon-btn" title="Home" onClick={onExit}><Home size={18} /></button>
          <span className="brand-mark" style={{ width: 22, height: 22, fontSize: 12 }}>R</span>
          <span className="project-title">{project.name}</span>
          <button className="icon-btn" title={project.isPublic ? 'Público' : 'Privado'} onClick={togglePublic}>
            {project.isPublic ? <Globe size={15} color="#7ee787" /> : <Lock size={15} />}
          </button>
          <span className={`status-dot ${project.running ? 'on' : ''}`} title={project.running ? 'Rodando' : 'Parado'} />
        </div>
        <div className="topbar-center">
          {project.running ? (
            <button className="btn btn-stop" onClick={stop}><Square size={14} fill="currentColor" /> Stop</button>
          ) : (
            <button className="btn btn-run" onClick={run}><Play size={14} fill="currentColor" /> Run</button>
          )}
        </div>
        <div className="topbar-right">
          <button className="icon-btn" title="Salvar tudo (Ctrl+S)" onClick={saveAll}>
            <Save size={16} color={dirtyCount ? 'var(--yellow)' : undefined} />
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{saving ? 'salvando...' : dirtyCount ? `${dirtyCount} não salvo(s)` : 'salvo'}</span>
        </div>
      </div>

      {error && <div style={{ background: '#3b1d1d', color: '#ffb4b4', padding: '6px 12px', fontSize: 13 }}>{error} <span style={{ cursor: 'pointer', marginLeft: 8 }} onClick={() => setError('')}>×</span></div>}

      <div className="workspace-body">
        <div className="activity-bar">
          <button className={`icon-btn ${activeView === 'files' ? 'active' : ''}`} title="Files" onClick={() => setActiveView('files')}><Files size={20} /></button>
          <button className={`icon-btn ${activeView === 'search' ? 'active' : ''}`} title="Search" onClick={() => setActiveView('search')}><Search size={20} /></button>
          <button className={`icon-btn ${activeView === 'git' ? 'active' : ''}`} title="Version control" onClick={() => setActiveView('git')}><GitBranch size={20} /></button>
          <button className={`icon-btn ${activeView === 'packages' ? 'active' : ''}`} title="Packages" onClick={() => setActiveView('packages')}><Package size={20} /></button>
          <div className="activity-spacer" />
          <button className={`icon-btn ${activeView === 'settings' ? 'active' : ''}`} title="Settings" onClick={() => setActiveView('settings')}><Settings size={20} /></button>
        </div>

        <div className="main-split">
          <Allotment>
            <Allotment.Pane preferredSize={260} minSize={180} maxSize={500}>
              {activeView === 'files' ? (
                <FileTree projectId={projectId} onOpenFile={openFile} activePath={activePath} />
              ) : (
                <div className="pane">
                  <div className="pane-header"><span>{activeView}</span></div>
                  <div className="pane-body"><div className="muted">
                    {activeView === 'search' && 'Busca no projeto — em breve.'}
                    {activeView === 'git' && 'Controle de versão — em breve.'}
                    {activeView === 'packages' && 'Gerenciador de pacotes — em breve.'}
                    {activeView === 'settings' && (
                      <div style={{ padding: 12, textTransform: 'none', letterSpacing: 0 }}>
                        <div style={{ marginBottom: 10, color: 'var(--text)', fontWeight: 600 }}>Configurações</div>
                        <div style={{ marginBottom: 8 }}>Run command:</div>
                        <code style={{ display: 'block', background: 'var(--bg-root)', padding: 8, borderRadius: 6, color: 'var(--text)' }}>{project.run}</code>
                        <div style={{ marginTop: 12, fontSize: 12 }}>Edite o arquivo <code>.replit</code> para alterar o comando de execução.</div>
                      </div>
                    )}
                  </div></div>
                </div>
              )}
            </Allotment.Pane>
            <Allotment.Pane>
              <Allotment vertical>
                <Allotment.Pane minSize={120}>
                  <EditorPane
                    tabs={tabs}
                    activePath={activePath}
                    onSelect={setActivePath}
                    onClose={closeTab}
                    onChange={changeTab}
                    onSave={saveTab}
                  />
                </Allotment.Pane>
                <Allotment.Pane preferredSize={280} minSize={120}>
                  <BottomPanel
                    projectId={projectId}
                    running={project.running}
                    port={project.port}
                    onRun={run}
                    onStop={stop}
                  />
                </Allotment.Pane>
              </Allotment>
            </Allotment.Pane>
          </Allotment>
        </div>
      </div>
    </div>
  );
}
