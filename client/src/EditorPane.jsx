import React, { useEffect, useMemo, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { X } from 'lucide-react';

function langFromPath(p) {
  const ext = (p.split('.').pop() || '').toLowerCase();
  const map = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', json: 'json', html: 'html', css: 'css', md: 'markdown', py: 'python', sh: 'shell', yml: 'yaml', yaml: 'yaml', c: 'c', cpp: 'cpp', h: 'cpp', rs: 'rust', go: 'go', java: 'java', rb: 'ruby', php: 'php', sql: 'sql', txt: 'plaintext' };
  return map[ext] || 'plaintext';
}

export default function EditorPane({ tabs, activePath, onSelect, onClose, onChange, onSave }) {
  const editorRef = useRef(null);
  const active = tabs.find(t => t.path === activePath);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLower() === 's') {
        e.preventDefault();
        if (activePath) onSave(activePath);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activePath, onSave]);

  return (
    <div className="editor-pane">
      <div className="tabs">
        {tabs.map(t => (
          <div key={t.path} className={`tab ${t.path === activePath ? 'active' : ''} ${t.dirty ? 'unsaved' : ''}`} onClick={() => onSelect(t.path)}>
            {t.dirty && <span className="dot" />}
            <span>{t.path.split('/').pop()}</span>
            <span className="close" onClick={(e) => { e.stopPropagation(); onClose(t.path); }}><X size={14} /></span>
          </div>
        ))}
      </div>
      <div className="editor-wrap">
        {!active ? (
          <div className="empty-editor">
            <div className="logo-big">{'</>'}</div>
            <div>Selecione um arquivo para editar</div>
            <div style={{ fontSize: 12 }}>Ctrl+S para salvar</div>
          </div>
        ) : (
          <Editor
            height="100%"
            theme="vs-dark"
            path={active.path}
            language={langFromPath(active.path)}
            value={active.content}
            onChange={(v) => onChange(active.path, v ?? '')}
            onMount={(editor) => { editorRef.current = editor; }}
            options={{
              fontSize: 14,
              minimap: { enabled: true },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              tabSize: 2,
              wordWrap: 'on',
            }}
          />
        )}
      </div>
    </div>
  );
}
