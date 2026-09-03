import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAviso } from './Aviso';
import { Save, ExternalLink, UserPlus, Trash2, X, Users, Store } from 'lucide-react';

/* Configuracoes da loja e usuarios do painel. */

export default function Config({ usuario }) {
  const aviso = useAviso();
  const [cfg, setCfg] = useState({
    nome_loja: '', loja_aberta: 'true', whatsapp_loja: '', endereco_loja: '',
    email_loja: '', cnpj_loja: '',
    frete_valor: '9.90', frete_gratis_acima: '99', pedido_minimo: '0',
  });
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [novoAberto, setNovoAberto] = useState(false);
  const [novo, setNovo] = useState({ nome: '', login: '', senha: '', role: 'operador' });
  const [removendo, setRemovendo] = useState(null);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try {
      const [c, u] = await Promise.all([
        api.get('/painel/settings'),
        api.get('/painel/users').catch(() => ({ data: [] })),
      ]);
      setCfg((atual) => ({ ...atual, ...c.data }));
      setUsuarios(Array.isArray(u.data) ? u.data.filter((x) => x.ativo) : []);
    } catch (err) {
      aviso.erro('Erro ao carregar as configurações');
    } finally {
      setCarregando(false);
    }
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.put('/painel/settings', {
        ...cfg,
        whatsapp_loja: String(cfg.whatsapp_loja || '').replace(/\D/g, ''),
      });
      aviso.sucesso('Configurações salvas');
    } catch (err) {
      aviso.erro(err.response?.data?.error || 'Não consegui salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function criarUsuario(e) {
    e.preventDefault();
    if (!novo.login.trim() || novo.senha.length < 6) {
      aviso.erro('Informe o login e uma senha de pelo menos 6 caracteres');
      return;
    }
    try {
      await api.post('/painel/users', novo);
      aviso.sucesso('Usuário criado');
      setNovoAberto(false);
      setNovo({ nome: '', login: '', senha: '', role: 'operador' });
      carregar();
    } catch (err) {
      aviso.erro(err.response?.data?.error || 'Não consegui criar');
    }
  }

  async function removerUsuario() {
    try {
      await api.delete(`/painel/users/${removendo.id}`);
      aviso.sucesso('Usuário removido');
      setRemovendo(null);
      carregar();
    } catch (err) {
      aviso.erro(err.response?.data?.error || 'Não consegui remover');
    }
  }

  if (carregando) return <div className="pn-carregando">Carregando…</div>;

  const enderecoDoCatalogo = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="pn-pagina">
      <header className="pn-cabecalho">
        <h1>Configurações</h1>
      </header>

      <section className="pn-secao">
        <h2><Store size={17} /> A loja</h2>

        <div className="pn-link-loja">
          <div>
            <span>Link para mandar aos clientes</span>
            <strong>{enderecoDoCatalogo}</strong>
          </div>
          <a className="pn-btn pn-btn-claro" href="/" target="_blank" rel="noopener noreferrer">
            <ExternalLink size={15} /> Abrir
          </a>
        </div>

        <form onSubmit={salvar}>
          <label className="pn-marcador" style={{ margin: '1rem 0' }}>
            <input
              type="checkbox"
              checked={cfg.loja_aberta !== 'false'}
              onChange={(e) => setCfg({ ...cfg, loja_aberta: e.target.checked ? 'true' : 'false' })}
            />
            <span>Aceitando pedidos agora</span>
          </label>

          <div className="pn-linha">
            <label className="pn-campo">
              <span>Nome da loja</span>
              <input value={cfg.nome_loja || ''} onChange={(e) => setCfg({ ...cfg, nome_loja: e.target.value })}
                placeholder="Aparece no topo do catálogo" />
            </label>
            <label className="pn-campo">
              <span>WhatsApp (só números, com DDD)</span>
              <input value={cfg.whatsapp_loja || ''} onChange={(e) => setCfg({ ...cfg, whatsapp_loja: e.target.value })}
                placeholder="21999999999" inputMode="numeric" />
            </label>
          </div>

          <label className="pn-campo">
            <span>Endereço mostrado no catálogo</span>
            <input value={cfg.endereco_loja || ''} onChange={(e) => setCfg({ ...cfg, endereco_loja: e.target.value })}
              placeholder="Rua, número, bairro" />
          </label>

          <div className="pn-linha">
            <label className="pn-campo">
              <span>E-mail</span>
              <input value={cfg.email_loja || ''} onChange={(e) => setCfg({ ...cfg, email_loja: e.target.value })}
                placeholder="contato@sualoja.com" inputMode="email" />
            </label>
            <label className="pn-campo">
              <span>CNPJ</span>
              <input value={cfg.cnpj_loja || ''} onChange={(e) => setCfg({ ...cfg, cnpj_loja: e.target.value })}
                placeholder="00.000.000/0001-00" />
            </label>
          </div>

          <div className="pn-linha">
            <label className="pn-campo">
              <span>Taxa de entrega (R$)</span>
              <input value={cfg.frete_valor || ''} onChange={(e) => setCfg({ ...cfg, frete_valor: e.target.value })}
                inputMode="decimal" />
            </label>
            <label className="pn-campo">
              <span>Entrega grátis acima de (R$)</span>
              <input value={cfg.frete_gratis_acima || ''} onChange={(e) => setCfg({ ...cfg, frete_gratis_acima: e.target.value })}
                inputMode="decimal" />
            </label>
            <label className="pn-campo">
              <span>Pedido mínimo (R$)</span>
              <input value={cfg.pedido_minimo || ''} onChange={(e) => setCfg({ ...cfg, pedido_minimo: e.target.value })}
                inputMode="decimal" />
            </label>
          </div>

          <p className="pn-dica">
            Sem o WhatsApp preenchido, o botão “Falar no WhatsApp” não aparece para o cliente
            no fim do pedido.
          </p>

          <div className="pn-modal-acoes" style={{ justifyContent: 'flex-start' }}>
            <button className="pn-btn pn-btn-primario" type="submit" disabled={salvando}>
              <Save size={16} /> {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </section>

      <section className="pn-secao">
        <div className="pn-secao-topo">
          <h2><Users size={17} /> Quem acessa o painel</h2>
          <button className="pn-btn pn-btn-claro" onClick={() => setNovoAberto(true)}>
            <UserPlus size={16} /> Novo usuário
          </button>
        </div>

        <div className="pn-usuarios">
          {usuarios.map((u) => (
            <div className="pn-usuario-linha" key={u.id}>
              <div>
                <strong>{u.nome}</strong>
                <span>{u.login} · {u.role}</span>
              </div>
              {u.id !== usuario.id && (
                <button className="pn-btn pn-btn-perigo pn-btn-mini" onClick={() => setRemovendo(u)}>
                  <Trash2 size={15} />
                </button>
              )}
              {u.id === usuario.id && <span className="pn-voce">você</span>}
            </div>
          ))}
        </div>
      </section>

      {novoAberto && (
        <div className="pn-modal-fundo" onClick={() => setNovoAberto(false)}>
          <form className="pn-modal" onClick={(e) => e.stopPropagation()} onSubmit={criarUsuario}>
            <div className="pn-modal-topo">
              <h2>Novo usuário</h2>
              <button type="button" onClick={() => setNovoAberto(false)}><X size={18} /></button>
            </div>
            <label className="pn-campo">
              <span>Nome</span>
              <input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} autoFocus />
            </label>
            <label className="pn-campo">
              <span>Login</span>
              <input value={novo.login} onChange={(e) => setNovo({ ...novo, login: e.target.value })} autoComplete="off" />
            </label>
            <label className="pn-campo">
              <span>Senha (mínimo 6)</span>
              <input type="password" value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} autoComplete="new-password" />
            </label>
            <label className="pn-campo">
              <span>Permissão</span>
              <select value={novo.role} onChange={(e) => setNovo({ ...novo, role: e.target.value })}>
                <option value="operador">Operador</option>
                <option value="admin">Administrador</option>
              </select>
            </label>
            <div className="pn-modal-acoes">
              <button type="button" className="pn-btn pn-btn-claro" onClick={() => setNovoAberto(false)}>Cancelar</button>
              <button type="submit" className="pn-btn pn-btn-primario">Criar</button>
            </div>
          </form>
        </div>
      )}

      {removendo && (
        <div className="pn-modal-fundo" onClick={() => setRemovendo(null)}>
          <div className="pn-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pn-modal-topo">
              <h2>Remover {removendo.nome}?</h2>
              <button onClick={() => setRemovendo(null)}><X size={18} /></button>
            </div>
            <p className="pn-modal-texto">Essa pessoa perde o acesso ao painel na hora.</p>
            <div className="pn-modal-acoes">
              <button className="pn-btn pn-btn-claro" onClick={() => setRemovendo(null)}>Voltar</button>
              <button className="pn-btn pn-btn-perigo" onClick={removerUsuario}>Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
