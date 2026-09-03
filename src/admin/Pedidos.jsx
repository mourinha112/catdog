import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useAviso } from './Aviso';
import {
  RefreshCw, Truck, Store, Phone, MapPin, Repeat, Check, X, Clock,
} from 'lucide-react';

/* Pedidos que chegam do catalogo. Confirmar da baixa no estoque. */

const FILTROS = [
  ['novo', 'Novos'],
  ['confirmado', 'Confirmados'],
  ['separando', 'Separando'],
  ['pronto', 'Prontos'],
  ['entregue', 'Entregues'],
  ['cancelado', 'Cancelados'],
  ['todos', 'Todos'],
];

// Preto solido no que precisa de acao; vai clareando conforme resolve.
const STATUS = {
  novo: { rotulo: 'Novo', cor: '#FFFFFF', fundo: '#111111' },
  confirmado: { rotulo: 'Confirmado', cor: '#111111', fundo: '#DCDCDC' },
  separando: { rotulo: 'Separando', cor: '#222222', fundo: '#E4E4E4' },
  pronto: { rotulo: 'Pronto', cor: '#111111', fundo: '#EDEDED' },
  entregue: { rotulo: 'Entregue', cor: '#767676', fundo: '#F2F2F2' },
  cancelado: { rotulo: 'Cancelado', cor: '#9E9E9E', fundo: '#F5F5F5' },
};

const PROXIMO = {
  confirmado: ['separando', 'Separar'],
  separando: ['pronto', 'Marcar pronto'],
  pronto: ['entregue', 'Marcar entregue'],
};

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const money = (v) => brl.format(Number(v) || 0);

function quando(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString()
    ? `hoje ${hora}`
    : `${d.toLocaleDateString('pt-BR')} ${hora}`;
}

function telefone(w) {
  const d = String(w || '').replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return w;
}

export default function Pedidos() {
  const aviso = useAviso();
  const [pedidos, setPedidos] = useState([]);
  const [filtro, setFiltro] = useState('novo');
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(null);
  const [confirmando, setConfirmando] = useState(null);
  const [pagamento, setPagamento] = useState('pix');
  const [cancelando, setCancelando] = useState(null);

  const carregar = useCallback(async (silencioso) => {
    if (!silencioso) setCarregando(true);
    try {
      const res = await api.get(`/admin/orders?status=${filtro}`);
      setPedidos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (!silencioso) aviso.erro('Erro ao carregar os pedidos');
    } finally {
      setCarregando(false);
    }
  }, [filtro]);

  useEffect(() => { carregar(); }, [carregar]);

  // Pedido novo cai na tela sozinho.
  useEffect(() => {
    const t = setInterval(() => carregar(true), 30000);
    return () => clearInterval(t);
  }, [carregar]);

  async function confirmar() {
    const pedido = confirmando;
    setOcupado(pedido.id);
    try {
      await api.post(`/admin/orders/${pedido.id}/confirmar`, { forma_pagamento: pagamento });
      aviso.sucesso(`Pedido #${pedido.id} confirmado e estoque baixado`);
      setConfirmando(null);
      carregar(true);
    } catch (err) {
      aviso.erro(err.response?.data?.error || 'Não foi possível confirmar');
    } finally {
      setOcupado(null);
    }
  }

  async function mudarStatus(pedido, status) {
    setOcupado(pedido.id);
    try {
      await api.put(`/admin/orders/${pedido.id}/status`, { status });
      carregar(true);
    } catch (err) {
      aviso.erro(err.response?.data?.error || 'Não foi possível atualizar');
    } finally {
      setOcupado(null);
    }
  }

  async function cancelar() {
    const pedido = cancelando;
    setCancelando(null);
    await mudarStatus(pedido, 'cancelado');
    aviso.sucesso(`Pedido #${pedido.id} cancelado`);
  }

  function abrirWhatsApp(pedido) {
    const numero = String(pedido.cliente_whatsapp || '').replace(/\D/g, '');
    if (!numero) return;
    const texto = `Oi ${pedido.cliente_nome}! Recebemos seu pedido #${pedido.id}.`;
    window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  }

  const novos = pedidos.filter((p) => p.status === 'novo').length;

  return (
    <div className="ad-pagina">
      <header className="ad-cabecalho">
        <h1>
          Pedidos
          {filtro === 'novo' && novos > 0 && <span className="ad-contador">{novos}</span>}
        </h1>
        <button className="ad-btn ad-btn-claro" onClick={() => carregar()}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </header>

      <div className="ad-chips ad-chips-larga">
        {FILTROS.map(([v, r]) => (
          <button key={v} className={`ad-chip ${filtro === v ? 'ativo' : ''}`} onClick={() => setFiltro(v)}>{r}</button>
        ))}
      </div>

      {carregando ? (
        <div className="ad-carregando">Carregando…</div>
      ) : pedidos.length === 0 ? (
        <div className="ad-vazio">Nenhum pedido nesse filtro.</div>
      ) : (
        <div className="ad-pedidos">
          {pedidos.map((p) => {
            const info = STATUS[p.status] || STATUS.novo;
            const proximo = PROXIMO[p.status];
            const travado = ocupado === p.id;

            return (
              <article className="ad-pedido" key={p.id}>
                <div className="ad-pedido-topo">
                  <div>
                    <div className="ad-pedido-num">Pedido #{p.id}</div>
                    <div className="ad-pedido-hora"><Clock size={12} /> {quando(p.created_at)}</div>
                  </div>
                  <span className="ad-selo" style={{ color: info.cor, background: info.fundo }}>{info.rotulo}</span>
                </div>

                <div className="ad-pedido-cliente">
                  <strong>{p.cliente_nome}</strong>
                  <button className="ad-zap" onClick={() => abrirWhatsApp(p)}>
                    <Phone size={13} /> {telefone(p.cliente_whatsapp)}
                  </button>
                </div>

                <div className="ad-pedido-entrega">
                  {p.tipo_entrega === 'entrega' ? <Truck size={16} /> : <Store size={16} />}
                  <div>
                    <div className="ad-pedido-entrega-tit">
                      {p.tipo_entrega === 'entrega' ? 'Entregar' : 'Retirar na loja'}
                      {p.janela ? ` · ${p.janela}` : ''}
                    </div>
                    {p.tipo_entrega === 'entrega' && p.endereco && (
                      <div className="ad-pedido-end">
                        <MapPin size={12} /> {p.endereco}{p.referencia ? ` — ${p.referencia}` : ''}
                      </div>
                    )}
                  </div>
                </div>

                <ul className="ad-pedido-itens">
                  {(p.order_items || []).map((it) => (
                    <li key={it.id}>
                      <span><b>{it.tipo_venda === 'kg' ? `${it.quantidade_kg} kg` : `${it.quantidade_kg}x`}</b> {it.descricao}</span>
                      <span>{money(it.subtotal)}</span>
                    </li>
                  ))}
                </ul>

                {p.observacao && <div className="ad-pedido-obs">“{p.observacao}”</div>}

                {p.assinatura && (
                  <div className="ad-pedido-clube">
                    <Repeat size={14} /> Cliente quer repetir{' '}
                    {p.frequencia === 'semanal' ? 'toda semana' : p.frequencia === 'mensal' ? 'todo mês' : 'a cada 15 dias'}
                  </div>
                )}

                <div className="ad-pedido-totais">
                  <span>Produtos {money(p.subtotal)}</span>
                  <span>{Number(p.frete) > 0 ? `Entrega ${money(p.frete)}` : 'Entrega grátis'}</span>
                  <strong>{money(p.total)}</strong>
                </div>

                <div className="ad-pedido-acoes">
                  {p.status === 'novo' && (
                    <button className="ad-btn ad-btn-primario" disabled={travado}
                      onClick={() => { setPagamento('pix'); setConfirmando(p); }}>
                      <Check size={16} /> Confirmar
                    </button>
                  )}
                  {proximo && (
                    <button className="ad-btn ad-btn-claro" disabled={travado}
                      onClick={() => mudarStatus(p, proximo[0])}>{proximo[1]}</button>
                  )}
                  {p.status !== 'cancelado' && p.status !== 'entregue' && (
                    <button className="ad-btn ad-btn-perigo" disabled={travado} onClick={() => setCancelando(p)}>
                      <X size={16} /> Cancelar
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {confirmando && (
        <div className="ad-modal-fundo" onClick={() => setConfirmando(null)}>
          <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ad-modal-topo">
              <h2>Confirmar pedido #{confirmando.id}</h2>
              <button onClick={() => setConfirmando(null)}><X size={18} /></button>
            </div>
            <p className="ad-modal-texto">
              Isso dá baixa no estoque dos itens e marca o pedido como confirmado.
              Só acontece uma vez por pedido.
            </p>
            <span className="ad-filtro-rotulo">Como o cliente vai pagar?</span>
            <div className="ad-chips" style={{ marginTop: 8 }}>
              {[['dinheiro', 'Dinheiro'], ['pix', 'PIX'], ['cartao', 'Cartão']].map(([v, r]) => (
                <button key={v} className={`ad-chip ${pagamento === v ? 'ativo' : ''}`} onClick={() => setPagamento(v)}>{r}</button>
              ))}
            </div>
            <div className="ad-modal-acoes">
              <button className="ad-btn ad-btn-claro" onClick={() => setConfirmando(null)}>Voltar</button>
              <button className="ad-btn ad-btn-primario" disabled={ocupado === confirmando.id} onClick={confirmar}>
                {ocupado === confirmando.id ? 'Confirmando…' : 'Confirmar pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelando && (
        <div className="ad-modal-fundo" onClick={() => setCancelando(null)}>
          <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ad-modal-topo">
              <h2>Cancelar pedido #{cancelando.id}?</h2>
              <button onClick={() => setCancelando(null)}><X size={18} /></button>
            </div>
            <p className="ad-modal-texto">
              O cliente não é avisado automaticamente — combine pelo WhatsApp antes.
              {cancelando.baixou_estoque && ' O estoque já baixado não volta sozinho: ajuste na tela de Produtos se precisar.'}
            </p>
            <div className="ad-modal-acoes">
              <button className="ad-btn ad-btn-claro" onClick={() => setCancelando(null)}>Voltar</button>
              <button className="ad-btn ad-btn-perigo" onClick={cancelar}>Cancelar pedido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
