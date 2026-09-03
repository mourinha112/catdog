import React, { Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';
import Erro from './Erro';

/*
 * Duas partes no mesmo deploy:
 *
 *   /        -> catalogo publico, sem login (o cliente fazendo o pedido)
 *   /admin   -> painel do lojista, atras de login
 *
 * Cada uma carrega so o seu pedaco: quem abre o catalogo no celular nao
 * baixa o painel junto.
 */
const Loja = lazy(() => import('./loja/Loja'));
const Admin = lazy(() => import('./admin/Admin'));

export default function App() {
  const { pathname } = useLocation();
  const noAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

  return (
    <Erro>
      <Suspense fallback={<Carregando />}>
        {noAdmin ? <Admin /> : <Loja />}
      </Suspense>
    </Erro>
  );
}

/*
 * Enquanto o pedaco da tela nao chega. Antes aqui era `null`: se o arquivo
 * pendurasse sem falhar, o React apagava o conteudo do HTML e sobrava
 * branco para sempre, sem erro nenhum. Agora aparece algo, e depois de 8s
 * a pessoa fica sabendo o que houve.
 */
function Carregando() {
  const [demorou, setDemorou] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setDemorou(true), 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24,
      background: '#E8E8E8', color: '#5A5A5A', textAlign: 'center',
      fontFamily: "'Segoe UI', -apple-system, system-ui, sans-serif",
    }}>
      <img src="/logo.png" alt="" style={{ width: 110 }} />
      <p>Carregando…</p>

      {demorou && (
        <div style={{
          maxWidth: 440, background: '#fff', borderRadius: 18, padding: 22,
          textAlign: 'left', boxShadow: '0 8px 30px rgba(0,0,0,.12)',
        }}>
          <h2 style={{ fontSize: '1.05rem', color: '#171717', margin: '0 0 8px' }}>
            Esta tela não terminou de carregar
          </h2>
          <p style={{ fontSize: '.88rem', lineHeight: 1.6, margin: '0 0 10px' }}>
            O arquivo desta parte do sistema não chegou. Quase sempre é
            antivírus, extensão do navegador ou a rede do local bloqueando
            o download.
          </p>
          <ul style={{ fontSize: '.88rem', lineHeight: 1.6, margin: '0 0 12px', paddingLeft: 20 }}>
            <li>Tente por outra rede (o 4G do celular, por exemplo)</li>
            <li>Desative o antivírus ou as extensões e recarregue</li>
          </ul>
          <button
            onClick={() => window.location.reload()}
            style={{
              width: '100%', minHeight: 44, border: 0, borderRadius: 12,
              background: '#111', color: '#fff', fontSize: '.95rem',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Tentar de novo
          </button>
        </div>
      )}
    </div>
  );
}
