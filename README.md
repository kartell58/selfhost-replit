# SelfHost Replit

Plataforma self-hosted estilo Replit: hospede no seu servidor e permita que qualquer pessoa (em projetos públicos) edite e execute aplicações direto no navegador.

## Recursos (MVP)
- Interface de workspace inspirada no Replit: explorador de arquivos, editor com abas, terminal, console de saída e preview web
- Gerenciamento de projetos (criar, listar, abrir, público/privado)
- Execução de aplicações com processos isolados por projeto
- Templates iniciais (Node.js, Python, HTML estático)
- Atualização de arquivos em tempo real via API/WebSocket
- Totalmente self-hosted (sem dependências de serviços externos)

## Stack
- **Server:** Node.js, Express, WebSocket, node-pty (quando disponível) / child_process
- **Client:** React, Vite, Monaco Editor, xterm.js, layout redimensionável
- **Armazenamento:** filesystem local (`projects/` e `server/data/`)

## Requisitos
- Node.js 20+
- npm
- (Opcional) Python 3 para template Python
- (Opcional) Docker para sandbox mais forte — roadmap

## Instalação
```bash
git clone https://github.com/kartell58/selfhost-replit.git
cd selfhost-replit
npm install
npm run install:all
npm run dev
```

- Server: `http://localhost:3001`
- Client (dev): `http://localhost:5173`

## Produção
```bash
npm run build
npm start
```
A aplicação servirá o client compilado e a API na porta `PORT` (padrão 3001).

## Segurança
Este projeto permite execução de código arbitrário. Se você expor publicamente:
- Rode atrás de proxy/rede confiável
- Use usuário do sistema sem privilégios
- Considere containers/VMs e limites de recursos
- Não hospede em máquinas com dados sensíveis sem isolamento adequado

## Licença
MIT
