import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { Play, Square, RefreshCw, ExternalLink } from 'lucide-react';

function XTermView({ wsUrl, active, inputEnabled = true }) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const wsRef = useRef(null);
  const fitRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const term = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      theme: { background: '#0b111d', foreground: '#d7dde5' },
      scrollback: 5000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    const onResize = () => { try { fit.fit(); } catch {} };
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(containerRef.current);

    return () => {
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      term.dispose();
      termRef.current = null;
    };
  }, []);

  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    // reset buffer when url changes
    term.clear();
    if (wsRef.current) { try { wsRef.current.close(); } catch {} wsRef.current = null; }
    if (!wsUrl) return;

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const url = wsUrl.startsWith('ws') ? wsUrl : `${proto}://${location.host}${wsUrl}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'output' || msg.type === 'history') term.write(msg.data || '');
        else if (msg.type === 'status') {
          // status handled elsewhere, but we can note
        } else if (msg.type === 'error') term.write(`\r\n\x1b[31m${msg.error}\x1b[0m\r\n`);
        else if (msg.type === 'exit') term.write(`\r\n\x1b[33m[shell exited ${msg.code}]\x1b[0m\r\n`);
      } catch {
        term.write(ev.data);
      }
    };
    ws.onclose = () => { /* noop */ };

    const disp = term.onData((data) => {
      if (!inputEnabled) return;
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'input', data }));
    });

    return () => {
      disp.dispose();
      try { ws.close(); } catch {}
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [wsUrl, inputEnabled]);

  useEffect(() => {
    if (active && fitRef.current) {
      setTimeout(() => { try { fitRef.current.fit(); } catch {} }, 50);
    }
  }, [active]);

  return <div ref={containerRef} className="terminal-wrap" />;
}

export default function BottomPanel({ projectId, running, port, onRun, onStop }) {
  const [tab, setTab] = useState('console');
  const [previewKey, setPreviewKey] = useState(0);
  const runWs = `/ws?projectId=${encodeURIComponent(projectId)}&type=run`;
  const shellWs = `/ws?projectId=${encodeURIComponent(projectId)}&type=shell`;
  const previewUrl = `/preview/${projectId}/`;

  useEffect(() => { if (running) setTab(t => t === 'preview' ? 'preview' : 'console'); }, [running]);

  return (
    <div className="pane" style={{ height: '100%' }}>
      <div className="panel-tabs">
        <div className={`panel-tab ${tab === 'console' ? 'active' : ''}`} onClick={() => setTab('console')}>Console</div>
        <div className={`panel-tab ${tab === 'shell' ? 'active' : ''}`} onClick={() => setTab('shell')}>Shell</div>
        <div className={`panel-tab ${tab === 'preview' ? 'active' : ''}`} onClick={() => setTab('preview')}>Preview</div>
        <div style={{ flex: 1 }} />
        {tab === 'console' && (
          running ? (
            <button className="btn btn-stop" onClick={onStop}><Square size={14} /> Stop</button>
          ) : (
            <button className="btn btn-run" onClick={onRun}><Play size={14} /> Run</button>
          )
        )}
        {tab === 'preview' && (
          <>
            <button className="icon-btn" title="Recarregar" onClick={() => setPreviewKey(k => k + 1)}><RefreshCw size={14} /></button>
            <a className="icon-btn" title="Abrir em nova aba" href={previewUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a>
          </>
        )}
      </div>
      <div className="panel-body" style={{ display: tab === 'console' ? 'block' : 'none' }}>
        <XTermView wsUrl={runWs} active={tab === 'console'} inputEnabled={true} />
      </div>
      <div className="panel-body" style={{ display: tab === 'shell' ? 'block' : 'none' }}>
        <XTermView wsUrl={shellWs} active={tab === 'shell'} inputEnabled={true} />
      </div>
      <div className="panel-body" style={{ display: tab === 'preview' ? 'block' : 'none' }}>
        {running && port ? (
          <div className="preview-wrap"><iframe key={previewKey} src={previewUrl} title="Preview" /></div>
        ) : (
          <div className="preview-empty">
            <div style={{ fontSize: 16, color: 'var(--text-dim)' }}>Nenhum preview disponível</div>
            <div>Execute o projeto para ver a saída web aqui.</div>
            <button className="btn btn-run" onClick={onRun}><Play size={14} /> Run</button>
          </div>
        )}
      </div>
    </div>
  );
}
