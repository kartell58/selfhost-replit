import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import { Plus, Box } from 'lucide-react';

export default function Home({ onOpen }) {
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [name, setName] = useState('');
  const [template, setTemplate] = useState('node');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [p, t] = await Promise.all([api.projects(), api.templates()]);
      setProjects(p);
      setTemplates(t);
      if (t[0] && !t.find(x => x.id === template)) setTemplate(t[0].id);
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const p = await api.createProject({ name, template, isPublic });
      setName('');
      await load();
      onOpen(p.id);
    } catch (e2) { setError(e2.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="home">
      <div className="home-header">
        <div className="brand"><span className="brand-mark">R</span> SelfHost Replit</div>
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Workspace self-hosted</div>
      </div>
      <div className="home-main">
        <div className="hero">
          <h1>Crie. Edite. Execute.</h1>
          <p>Clone self-hosted do Replit — qualquer pessoa pode abrir e rodar projetos públicos no seu servidor.</p>
        </div>

        <div className="create-card">
          <form className="create-row" onSubmit={create}>
            <div className="field" style={{ flex: 1, minWidth: 240 }}>
              <label>Nome do projeto</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="meu-app" />
            </div>
            <div className="field">
              <label>Template</label>
              <select value={template} onChange={(e) => setTemplate(e.target.value)}>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Visibilidade</label>
              <select value={isPublic ? 'public' : 'private'} onChange={(e) => setIsPublic(e.target.value === 'public')}>
                <option value="public">Público</option>
                <option value="private">Privado</option>
              </select>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Plus size={16} /> {loading ? 'Criando...' : 'Criar Repl'}
            </button>
          </form>
          {error && <div style={{ color: 'var(--red)', marginTop: 10 }}>{error}</div>}
        </div>

        <h2 className="section-title">Meus Repls</h2>
        {projects.length === 0 ? (
          <div className="empty">Nenhum projeto ainda. Crie o primeiro acima.</div>
        ) : (
          <div className="projects-grid">
            {projects.map(p => (
              <div key={p.id} className="project-card" onClick={() => onOpen(p.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Box size={16} color="var(--accent)" />
                    <h3>{p.name}</h3>
                  </div>
                  <span className={`pill ${p.isPublic ? 'public' : ''}`}>{p.isPublic ? 'public' : 'private'}</span>
                </div>
                <div className="project-meta">
                  <span>{p.template}</span>
                  <span>{p.running ? '● rodando' : '○ parado'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
