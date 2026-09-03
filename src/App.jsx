import React from 'react';
import { useLocation } from 'react-router-dom';
import Erro from './Erro';
import Loja from './loja/Loja';
import Admin from './admin/Admin';

/*
 * Tres endereços no mesmo deploy:
 *
 *   /         -> catalogo publico, sem login
 *   /painel   -> painel do lojista (endereco principal)
 *   /admin    -> mesma coisa, mantido porque ja foi divulgado
 *   /teste    -> pagina crua de diagnostico, sem CSS nem icone nenhum
 *
 * O /painel existe porque houve caso de o /admin nao abrir numa maquina
 * enquanto o catalogo abria normal, no mesmo navegador. Filtro de rede e
 * antivirus costumam barrar endereco que contenha "admin". Ter um segundo
 * caminho resolve na hora e ainda diz onde estava o problema.
 */
const CAMINHOS_DO_PAINEL = ['/painel', '/admin'];

export default function App() {
  const { pathname } = useLocation();

  if (pathname === '/teste') return <Teste />;

  const base = CAMINHOS_DO_PAINEL.find(
    (c) => pathname === c || pathname.startsWith(c + '/'),
  );

  return (
    <Erro>
      {base ? <Admin base={base} /> : <Loja />}
    </Erro>
  );
}

/*
 * Diagnostico: HTML puro, sem estilo de arquivo, sem imagem, sem icone.
 * Se esta pagina aparece, o aplicativo esta rodando na maquina - e o que
 * quer que esteja falhando esta em outro lugar.
 */
function Teste() {
  return (
    <div style={{
      padding: 24, fontFamily: 'system-ui, sans-serif', fontSize: 16,
      lineHeight: 1.7, color: '#111', background: '#fff', minHeight: '100vh',
    }}>
      <h1 style={{ fontSize: 22 }}>O aplicativo está rodando</h1>
      <p>Se você está lendo isto, o JavaScript carregou e executou normalmente.</p>
      <hr />
      <p><strong>Endereço:</strong> {window.location.href}</p>
      <p><strong>Navegador:</strong> {navigator.userAgent}</p>
      <p><strong>Tela:</strong> {window.innerWidth} x {window.innerHeight}</p>
      <p><strong>Proporção:</strong> {Math.round((window.outerWidth / window.innerWidth) * 100)}%
        {' '}(se estiver longe de 100%, o navegador está com zoom)</p>
      <hr />
      <p>
        <a href="/painel">Abrir o painel em /painel</a><br />
        <a href="/admin">Abrir o painel em /admin</a><br />
        <a href="/">Abrir o catálogo</a>
      </p>
    </div>
  );
}
