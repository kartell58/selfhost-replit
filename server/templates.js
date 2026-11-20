export const templates = {
  node: {
    name: 'Node.js',
    run: 'node index.js',
    files: {
      'index.js': `const http = require('http');

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Hello from SelfHost Replit (Node.js)!\\n');
});

server.listen(port, () => {
  console.log('Server running on port ' + port);
});
`,
      'package.json': `{
  "name": "node-app",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  }
}
`,
      '.replit': 'run = "node index.js"\n'
    }
  },
  python: {
    name: 'Python',
    run: 'python3 main.py',
    files: {
      'main.py': `from http.server import BaseHTTPRequestHandler, HTTPServer
import os

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/plain; charset=utf-8')
        self.end_headers()
        self.wfile.write(b'Hello from SelfHost Replit (Python)!\\n')

    def log_message(self, format, *args):
        print("%s - %s" % (self.address_string(), format % args))

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    server = HTTPServer(('0.0.0.0', port), Handler)
    print('Server running on port', port)
    server.serve_forever()
`,
      '.replit': 'run = "python3 main.py"\n'
    }
  },
  static: {
    name: 'HTML, CSS, JS',
    run: 'python3 -m http.server ${PORT:-3000}',
    files: {
      'index.html': `<!doctype html>
<html lang="pt-br">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SelfHost Replit App</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <main>
      <h1>Olá, SelfHost Replit!</h1>
      <p>Edite os arquivos e clique em Run.</p>
      <button id="btn">Clique</button>
      <pre id="out"></pre>
    </main>
    <script src="script.js"></script>
  </body>
</html>
`,
      'style.css': `:root { color-scheme: dark; }
body { margin: 0; font-family: system-ui, sans-serif; background: #0e1525; color: #e6edf3; }
main { max-width: 720px; margin: 40px auto; padding: 0 16px; }
button { background: #0079f2; color: white; border: 0; padding: 10px 14px; border-radius: 8px; cursor: pointer; }
pre { margin-top: 16px; color: #9db2c7; }
`,
      'script.js': `document.getElementById('btn').addEventListener('click', () => {
  document.getElementById('out').textContent = 'Rodando no navegador em ' + new Date().toLocaleString();
});
`,
      '.replit': 'run = "python3 -m http.server ${PORT:-3000}"\n'
    }
  }
};
