import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

/*
 * Servidor de desenvolvimento.
 *
 * Na Vercel, /api/* cai direto na funcao de api/index.js. Aqui na maquina
 * isso nao existe, entao este arquivo levanta o mesmo handler num
 * servidor comum e o Vite manda /api para ca (veja o proxy no
 * vite.config.js). O codigo da API e exatamente o mesmo dos dois lados.
 */

const PORTA = 3001;

// --- carrega o .env sem depender de biblioteca ---
const arquivoEnv = path.resolve(process.cwd(), '.env');
if (fs.existsSync(arquivoEnv)) {
  for (const linha of fs.readFileSync(arquivoEnv, 'utf8').split('\n')) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith('#')) continue;
    const corte = limpa.indexOf('=');
    if (corte < 0) continue;
    const chave = limpa.slice(0, corte).trim();
    const valor = limpa.slice(corte + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[chave]) process.env[chave] = valor;
  }
  console.log('.env carregado');
} else {
  console.warn('AVISO: nao achei o arquivo .env — a API nao vai conseguir falar com o Supabase.');
  console.warn('       Copie o .env.example para .env e preencha.');
}

// O handler le as variaveis quando e importado, entao so importa depois.
const { default: handler } = await import('./index.js');

const servidor = http.createServer((req, res) => {
  let bruto = '';
  req.on('data', (pedaco) => { bruto += pedaco; });
  req.on('end', async () => {
    try { req.body = bruto ? JSON.parse(bruto) : {}; } catch (_) { req.body = {}; }

    // A funcao da Vercel usa res.status().json(); aqui a gente empresta.
    res.status = (codigo) => { res.statusCode = codigo; return res; };
    res.json = (dados) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(dados));
      return res;
    };

    try {
      await handler(req, res);
    } catch (erro) {
      console.error('Erro na API:', erro);
      if (!res.writableEnded) res.status(500).json({ error: erro.message });
    }
  });
});

servidor.listen(PORTA, () => {
  console.log(`API de desenvolvimento em http://localhost:${PORTA}`);
});
