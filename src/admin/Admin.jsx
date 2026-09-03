import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { ProvedorDeAvisos } from './Aviso';
import Login from './Login';
import api from '../api';
import {
  LayoutDashboard, ClipboardList, Package, Settings as Engrenagem,
  ExternalLink, LogOut, Menu, X, User,
} from 'lucide-react';
import './admin.css';

import Painel from './Painel';
import Pedidos from './Pedidos';
import Produtos from './Produtos';
import Config from './Config';

// O endereco base vem do App: pode ser /painel ou /admin.
const MENU = [
  { sufixo: '', rotulo: 'Painel', icone: LayoutDashboard, exato: true },
  { sufixo: '/pedidos', rotulo: 'Pedidos', icone: ClipboardList },
  { sufixo: '/produtos', rotulo: 'Produtos', icone: Package },
  { sufixo: '/config', rotulo: 'Configurações', icone: Engrenagem },
];

/*
 * Le a sessao guardada. Tudo dentro de try/catch porque o localStorage
 * lanca excecao quando o navegador bloqueia dados do site - e ai o painel
 * inteiro morria antes de desenhar qualquer coisa.
 */
function lerSessao() {
  try {
    const guardado = localStorage.getItem('cat_user');
    const token = localStorage.getItem('cat_token');
    if (guardado && token) return JSON.parse(guardado);
  } catch (_) { /* sem localStorage: entra como deslogado */ }
  return null;
}

export default function Admin({ base = '/painel' }) {
  // Resolvido na primeira renderizacao, de proposito. Antes isto vivia num
  // useEffect e o componente devolvia null enquanto isso: se o efeito nao
  // completasse, a tela ficava vazia para sempre, sem erro nenhum.
  const [usuario, setUsuario] = useState(lerSessao);
  const [menuAberto, setMenuAberto] = useState(false);
  const [pedidosNovos, setPedidosNovos] = useState(0);

  // Pedido novo aparece como bolinha no menu, sem precisar recarregar.
  useEffect(() => {
    if (!usuario) return undefined;
    const buscar = () => api.get('/painel/orders?status=novo')
      .then((r) => setPedidosNovos(Array.isArray(r.data) ? r.data.length : 0))
      .catch(() => {});
    buscar();
    const t = setInterval(buscar, 60000);
    return () => clearInterval(t);
  }, [usuario]);

  useEffect(() => {
    document.body.classList.add('pn-body');
    // Ver o comentario no topo do admin.css: garante que nada de fora
    // tire o body do fluxo e faca a pagina sumir no desktop.
    document.body.style.setProperty('position', 'static', 'important');
    return () => document.body.classList.remove('pn-body');
  }, []);

  function sair() {
    try {
      localStorage.removeItem('cat_token');
      localStorage.removeItem('cat_user');
    } catch (_) { /* ignora */ }
    setUsuario(null);
  }

  if (!usuario) {
    return (
      <ProvedorDeAvisos>
        <Login aoEntrar={setUsuario} />
      </ProvedorDeAvisos>
    );
  }

  return (
    <ProvedorDeAvisos>
      <div className="pn-layout">
        <aside className={`pn-menu ${menuAberto ? 'aberto' : ''}`}>
          <div className="pn-marca">
            <img src="/logo.png" alt="" />
            <div>
              <strong>Painel</strong>
              <span>Catálogo digital</span>
            </div>
            <button className="pn-menu-fechar" onClick={() => setMenuAberto(false)} aria-label="Fechar menu">
              <X size={22} />
            </button>
          </div>

          <nav className="pn-nav" onClick={() => setMenuAberto(false)}>
            {MENU.map((item) => (
              <NavLink
                key={item.sufixo}
                to={base + item.sufixo}
                end={item.exato}
                className={({ isActive }) => `pn-link ${isActive ? 'ativo' : ''}`}
              >
                <span className="pn-link-icone"><item.icone size={19} /></span>
                <span className="pn-link-texto">{item.rotulo}</span>
                {item.sufixo === '/pedidos' && pedidosNovos > 0 && (
                  <span className="pn-link-bolinha">{pedidosNovos}</span>
                )}
              </NavLink>
            ))}
          </nav>

          <a className="pn-ver-loja" href="/" target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} /> Ver o catálogo
          </a>

          <div className="pn-usuario">
            <div className="pn-usuario-foto"><User size={17} /></div>
            <div className="pn-usuario-texto">
              <strong>{usuario.nome}</strong>
              <span>{usuario.role}</span>
            </div>
            <button onClick={sair} title="Sair"><LogOut size={17} /></button>
          </div>
        </aside>

        {menuAberto && <div className="pn-fundo" onClick={() => setMenuAberto(false)} />}

        <main className="pn-conteudo">
          <button className="pn-menu-abrir" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
            <Menu size={22} />
          </button>

          <Routes>
              <Route path={base} element={<Painel />} />
              <Route path={base + '/pedidos'} element={<Pedidos />} />
              <Route path={base + '/produtos'} element={<Produtos />} />
              <Route path={base + '/config'} element={<Config usuario={usuario} />} />
              <Route path="*" element={<Navigate to={base} replace />} />
          </Routes>
        </main>
      </div>
    </ProvedorDeAvisos>
  );
}
