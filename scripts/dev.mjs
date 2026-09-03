import { spawn } from 'node:child_process';

/* Sobe a API e o site juntos, com um comando so: npm run dev */

const ehWindows = process.platform === 'win32';

function subir(nome, comando, argumentos) {
  const p = spawn(comando, argumentos, { stdio: 'inherit', shell: ehWindows });
  p.on('exit', (codigo) => {
    console.log(`[${nome}] encerrou (${codigo})`);
    process.exit(codigo ?? 0);
  });
  return p;
}

const api = subir('api', 'node', ['api/local.js']);
const web = subir('web', 'npx', ['vite', '--port', '3000']);

for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => { api.kill(); web.kill(); process.exit(0); });
}
