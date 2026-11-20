import React, { useEffect, useState } from 'react';
import Home from './Home.jsx';
import Workspace from './Workspace.jsx';

function getHashProject() {
  const m = location.hash.match(/^#\/project\/([^/?]+)/);
  return m ? m[1] : null;
}

export default function App() {
  const [projectId, setProjectId] = useState(getHashProject());

  useEffect(() => {
    const onHash = () => setProjectId(getHashProject());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (projectId) {
    return <Workspace projectId={projectId} onExit={() => { location.hash = ''; }} />;
  }
  return <Home onOpen={(id) => { location.hash = `#/project/${id}`; }} />;
}
