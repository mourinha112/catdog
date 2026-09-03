import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

/* =====================================================================
   API do catalogo digital.
   Uma unica funcao serverless; a Vercel manda /api/* tudo para ca.
   ===================================================================== */

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
// Se a service_role existir, ela e usada (ignora RLS). Senao, a anon.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_ANON_KEY
  || process.env.VITE_SUPABASE_ANON_KEY
  || '';

const AUTH_SECRET = process.env.AUTH_SECRET || '';

let supabase = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.error('Supabase init:', e);
  }
}

/* ----------------------------------------------------------- helpers */

function caminho(bruto) {
  const semQuery = (bruto || '').split('?')[0].trim() || '';
  if (semQuery.startsWith('http')) {
    try { return new URL(semQuery).pathname; } catch (_) { return semQuery; }
  }
  return semQuery.startsWith('/') ? semQuery : '/' + semQuery;
}

function corpo(req) {
  if (!req.body) return {};
  return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
}

function busca(bruto) {
  try {
    if (String(bruto).includes('?')) {
      return Object.fromEntries(new URLSearchParams(String(bruto).split('?')[1]));
    }
  } catch (_) { /* ignora */ }
  return {};
}

const centavos = (v) => Math.round((Number(v) || 0) * 100) / 100;
const soDigitos = (t) => String(t || '').replace(/\D/g, '');

/* --------------------------------------------------------- seguranca */

/** Senha guardada como scrypt$salt$hash - nunca em texto puro. */
function criarHash(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivada = crypto.scryptSync(String(senha), salt, 32).toString('hex');
  return `scrypt$${salt}$${derivada}`;
}

function conferirSenha(senha, guardado) {
  const partes = String(guardado || '').split('$');
  if (partes.length !== 3 || partes[0] !== 'scrypt') return false;
  const derivada = crypto.scryptSync(String(senha), partes[1], 32).toString('hex');
  const a = Buffer.from(derivada, 'hex');
  const b = Buffer.from(partes[2], 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Token assinado: id.expira.assinatura - o navegador nao consegue forjar. */
function criarToken(user) {
  const corpoToken = `${user.id}.${Date.now() + 30 * 24 * 60 * 60 * 1000}`;
  const assinatura = crypto.createHmac('sha256', AUTH_SECRET || supabaseKey)
    .update(corpoToken).digest('hex').slice(0, 32);
  return `${corpoToken}.${assinatura}`;
}

function lerToken(req) {
  const cabecalho = req.headers?.authorization || req.headers?.Authorization || '';
  const token = String(cabecalho).replace(/^Bearer\s+/i, '').trim();
  const partes = token.split('.');
  if (partes.length !== 3) return null;

  const corpoToken = `${partes[0]}.${partes[1]}`;
  const esperada = crypto.createHmac('sha256', AUTH_SECRET || supabaseKey)
    .update(corpoToken).digest('hex').slice(0, 32);
  if (esperada !== partes[2]) return null;
  if (Number(partes[1]) < Date.now()) return null;

  return { id: Number(partes[0]) };
}

/* =================================================================== */

export default async function handler(req, res) {
  const metodo = req.method || 'GET';
  const bruto = req.url || req.path || '';
  const url = caminho(bruto);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (metodo === 'OPTIONS') return res.status(200).end();

  if (!supabase) {
    return res.status(500).json({
      error: 'Banco nao configurado. Falta SUPABASE_URL e SUPABASE_ANON_KEY nas variaveis de ambiente.',
    });
  }

  // Tudo que comeca com /api/admin exige estar logado.
  const precisaLogin = url.startsWith('/api/admin');
  const usuario = precisaLogin ? lerToken(req) : null;
  if (precisaLogin && !usuario) {
    return res.status(401).json({ error: 'Sessao expirada. Entre de novo.' });
  }

  try {
    /* ================================================================
       AUTENTICACAO
       ================================================================ */
    if (url === '/api/auth/check' && metodo === 'GET') {
      const { data } = await supabase.from('users').select('id').eq('ativo', true).limit(1);
      return res.json({ temUsuarios: (data || []).length > 0 });
    }

    if (url === '/api/auth/login' && metodo === 'POST') {
      const { login, senha } = corpo(req);
      const { data } = await supabase
        .from('users').select('*').eq('login', String(login || '').trim()).eq('ativo', true).limit(1);

      const achado = (data || [])[0];
      if (!achado || !conferirSenha(senha, achado.senha_hash)) {
        return res.status(401).json({ error: 'Login ou senha incorretos' });
      }
      return res.json({
        token: criarToken(achado),
        user: { id: achado.id, nome: achado.nome, login: achado.login, role: achado.role },
      });
    }

    // Primeiro acesso: so funciona enquanto nao existe nenhum usuario.
    if (url === '/api/auth/setup' && metodo === 'POST') {
      const { data: existentes } = await supabase.from('users').select('id').limit(1);
      if ((existentes || []).length > 0) {
        return res.status(409).json({ error: 'O painel ja tem um usuario. Faca login.' });
      }
      const { nome, login, senha } = corpo(req);
      if (!login || String(senha || '').length < 6) {
        return res.status(400).json({ error: 'Informe o login e uma senha de pelo menos 6 caracteres' });
      }
      const { data, error } = await supabase.from('users').insert([{
        nome: nome || login,
        login: String(login).trim(),
        senha_hash: criarHash(senha),
        role: 'admin',
      }]).select();
      if (error) throw error;
      return res.status(201).json({
        token: criarToken(data[0]),
        user: { id: data[0].id, nome: data[0].nome, login: data[0].login, role: data[0].role },
      });
    }

    if (url === '/api/admin/users' && metodo === 'GET') {
      const { data } = await supabase
        .from('users').select('id, nome, login, role, ativo, created_at').order('id');
      return res.json(data || []);
    }

    if (url === '/api/admin/users' && metodo === 'POST') {
      const { nome, login, senha, role } = corpo(req);
      if (!login || String(senha || '').length < 6) {
        return res.status(400).json({ error: 'Informe o login e uma senha de pelo menos 6 caracteres' });
      }
      const { data, error } = await supabase.from('users').insert([{
        nome: nome || login,
        login: String(login).trim(),
        senha_hash: criarHash(senha),
        role: role === 'admin' ? 'admin' : 'operador',
      }]).select();
      if (error) {
        return res.status(400).json({ error: error.code === '23505' ? 'Esse login ja existe' : error.message });
      }
      return res.status(201).json({ id: data[0].id });
    }

    if (url.match(/^\/api\/admin\/users\/\d+$/) && metodo === 'DELETE') {
      const id = Number(url.split('/').pop());
      if (id === usuario.id) return res.status(400).json({ error: 'Voce nao pode remover a si mesmo' });
      await supabase.from('users').update({ ativo: false }).eq('id', id);
      return res.json({ ok: true });
    }

    /* ================================================================
       CATALOGO PUBLICO (a loja do cliente final)
       ================================================================ */
    if (url === '/api/shop/config' && metodo === 'GET') {
      const { data } = await supabase.from('settings').select('*');
      const s = {};
      for (const linha of data || []) s[linha.key] = linha.value;
      return res.json({
        nome_loja: s.nome_loja || 'Catalogo',
        loja_aberta: s.loja_aberta !== 'false',
        whatsapp_loja: s.whatsapp_loja || '',
        endereco_loja: s.endereco_loja || '',
        email_loja: s.email_loja || '',
        cnpj_loja: s.cnpj_loja || '',
        frete_valor: parseFloat(s.frete_valor || '9.90') || 0,
        frete_gratis_acima: parseFloat(s.frete_gratis_acima || '99') || 0,
        pedido_minimo: parseFloat(s.pedido_minimo || '0') || 0,
      });
    }

    if (url === '/api/shop/products' && metodo === 'GET') {
      const { data, error } = await supabase
        .from('products').select('*').eq('ativo', 1).order('nome');
      if (error) throw error;

      const lista = (data || [])
        .filter((p) => p.visivel_loja !== false)
        .map((p) => {
          const ehRacao = !p.categoria || p.categoria === 'racao';
          return {
            id: p.id,
            nome: p.nome,
            marca: p.marca || '',
            categoria: p.categoria || 'racao',
            especie: p.especie || null,
            porte: p.porte || null,
            perfil: p.perfil || null,
            foto_url: p.foto_url || null,
            peso_saco_kg: Number(p.peso_saco_kg) || 0,
            preco_saco_fechado: Number(p.preco_saco_fechado) || 0,
            preco_por_kg: Number(p.preco_por_kg) || 0,
            preco_unitario: Number(p.preco_unitario) || 0,
            estoque_kg: Number(p.estoque_kg) || 0,
            estoque_unidade: Number(p.estoque_unidade) || 0,
            tem_saco: ehRacao && Number(p.preco_saco_fechado) > 0 && Number(p.peso_saco_kg) > 0,
            tem_kg: ehRacao && p.vende_fracionado !== false && Number(p.preco_por_kg) > 0,
            tem_unidade: !ehRacao && Number(p.preco_unitario) > 0,
          };
        })
        .filter((p) => p.tem_saco || p.tem_kg || p.tem_unidade);

      return res.json(lista);
    }

    // Mais pedidos: ranking real pelos pedidos ja confirmados
    if (url === '/api/shop/destaques' && metodo === 'GET') {
      const desde = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data: pedidos } = await supabase
        .from('orders').select('id').gte('created_at', desde).neq('status', 'cancelado').limit(2000);

      const ids = (pedidos || []).map((p) => p.id);
      if (ids.length === 0) return res.json([]);

      const { data: itens } = await supabase
        .from('order_items').select('product_id').in('order_id', ids).limit(8000);

      const conta = {};
      for (const it of itens || []) {
        if (it.product_id) conta[it.product_id] = (conta[it.product_id] || 0) + 1;
      }
      return res.json(
        Object.keys(conta)
          .map((id) => ({ id: Number(id), vezes: conta[id] }))
          .sort((a, b) => b.vezes - a.vezes)
          .slice(0, 6)
          .map((r) => r.id),
      );
    }

    // Historico do cliente, achado pelo WhatsApp
    if (url.startsWith('/api/shop/orders') && metodo === 'GET') {
      const whatsapp = soDigitos(busca(bruto).whatsapp);
      if (whatsapp.length < 10) return res.json([]);

      const { data, error } = await supabase
        .from('orders')
        .select('id, created_at, status, tipo_entrega, janela, endereco, subtotal, frete, total, assinatura, frequencia, order_items(*)')
        .eq('cliente_whatsapp', whatsapp)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return res.json(data || []);
    }

    // Criar pedido
    if (url === '/api/shop/orders' && metodo === 'POST') {
      const dados = corpo(req);
      const itens = Array.isArray(dados.items) ? dados.items : [];

      if (!String(dados.cliente_nome || '').trim()) {
        return res.status(400).json({ error: 'Informe seu nome' });
      }
      const whatsapp = soDigitos(dados.cliente_whatsapp);
      if (whatsapp.length < 10) {
        return res.status(400).json({ error: 'Informe um WhatsApp valido com DDD' });
      }
      if (itens.length === 0) return res.status(400).json({ error: 'Pedido sem itens' });

      const tipoEntrega = dados.tipo_entrega === 'retirada' ? 'retirada' : 'entrega';
      if (tipoEntrega === 'entrega' && !String(dados.endereco || '').trim()) {
        return res.status(400).json({ error: 'Informe o endereco de entrega' });
      }

      // Preco e estoque sempre recalculados aqui: o navegador so diz o que
      // a pessoa escolheu, nunca quanto custa.
      const linhas = [];
      let subtotal = 0;

      for (const item of itens) {
        const { data: prod } = await supabase
          .from('products').select('*').eq('id', item.product_id).single();

        if (!prod || prod.ativo !== 1 || prod.visivel_loja === false) {
          return res.status(409).json({ error: 'Um dos produtos saiu do catalogo. Revise o carrinho.' });
        }

        const qtd = Number(item.quantidade_kg) || 0;
        if (qtd <= 0) continue;

        const ehRacao = !prod.categoria || prod.categoria === 'racao';
        let tipoVenda = item.tipo_venda;
        if (!ehRacao) tipoVenda = 'unidade';
        else if (tipoVenda !== 'saco') tipoVenda = 'kg';

        let precoUnit = 0;
        let kgEquivalente = 0;
        if (tipoVenda === 'saco') {
          precoUnit = Number(prod.preco_saco_fechado) || 0;
          kgEquivalente = qtd * (Number(prod.peso_saco_kg) || 0);
        } else if (tipoVenda === 'kg') {
          precoUnit = Number(prod.preco_por_kg) || 0;
          kgEquivalente = qtd;
        } else {
          precoUnit = Number(prod.preco_unitario) || 0;
        }

        if (precoUnit <= 0) {
          return res.status(409).json({ error: `${prod.nome} esta sem preco cadastrado.` });
        }
        if (tipoVenda === 'unidade') {
          if ((Number(prod.estoque_unidade) || 0) < qtd) {
            return res.status(409).json({ error: `${prod.nome}: restam ${prod.estoque_unidade} unidade(s).` });
          }
        } else if ((Number(prod.estoque_kg) || 0) < kgEquivalente) {
          return res.status(409).json({ error: `${prod.nome}: restam ${Number(prod.estoque_kg).toFixed(1)} kg.` });
        }

        const linhaSubtotal = centavos(qtd * precoUnit);
        subtotal += linhaSubtotal;

        let descricao = `${prod.marca ? prod.marca + ' ' : ''}${prod.nome}`;
        if (tipoVenda === 'saco') descricao += ` - Saco ${prod.peso_saco_kg} kg`;
        else if (tipoVenda === 'kg') descricao += ` - Fracionado ${qtd} kg`;
        else descricao += ` - ${qtd} un`;

        linhas.push({
          product_id: prod.id,
          descricao,
          tipo_venda: tipoVenda,
          quantidade_kg: qtd,
          preco_unitario: precoUnit,
          subtotal: linhaSubtotal,
        });
      }

      if (linhas.length === 0) return res.status(400).json({ error: 'Pedido sem itens validos' });
      subtotal = centavos(subtotal);

      const { data: cfgLinhas } = await supabase.from('settings').select('*');
      const cfg = {};
      for (const l of cfgLinhas || []) cfg[l.key] = l.value;

      const freteValor = parseFloat(cfg.frete_valor || '9.90') || 0;
      const freteGratis = parseFloat(cfg.frete_gratis_acima || '99') || 0;
      const minimo = parseFloat(cfg.pedido_minimo || '0') || 0;

      if (minimo > 0 && subtotal < minimo) {
        return res.status(400).json({ error: `Pedido minimo de R$ ${minimo.toFixed(2)}` });
      }

      const frete = tipoEntrega === 'entrega' && subtotal < freteGratis ? freteValor : 0;
      const total = centavos(subtotal + frete);

      // Cliente: reaproveita pelo WhatsApp, cadastra se for novo
      let clientId = null;
      const { data: achado } = await supabase
        .from('clients').select('id').eq('whatsapp', whatsapp).limit(1);

      if (achado && achado.length > 0) {
        clientId = achado[0].id;
        await supabase.from('clients').update({
          nome: String(dados.cliente_nome).trim(),
          endereco: dados.endereco || null,
          referencia: dados.referencia || null,
          ultimo_pedido: new Date().toISOString(),
        }).eq('id', clientId);
      } else {
        const { data: novo } = await supabase.from('clients').insert([{
          nome: String(dados.cliente_nome).trim(),
          whatsapp,
          endereco: dados.endereco || null,
          referencia: dados.referencia || null,
          ultimo_pedido: new Date().toISOString(),
        }]).select();
        if (novo && novo.length > 0) clientId = novo[0].id;
      }

      const { data: pedido, error: erroPedido } = await supabase.from('orders').insert([{
        client_id: clientId,
        cliente_nome: String(dados.cliente_nome).trim(),
        cliente_whatsapp: whatsapp,
        tipo_entrega: tipoEntrega,
        endereco: tipoEntrega === 'entrega' ? String(dados.endereco || '').trim() : null,
        referencia: dados.referencia || null,
        janela: dados.janela || null,
        observacao: dados.observacao || null,
        subtotal, frete, total,
        status: 'novo',
        assinatura: !!dados.assinatura,
        frequencia: dados.assinatura ? (dados.frequencia || 'quinzenal') : null,
      }]).select();

      if (erroPedido) throw erroPedido;
      const pedidoId = pedido[0].id;

      for (const linha of linhas) {
        await supabase.from('order_items').insert([{ order_id: pedidoId, ...linha }]);
      }

      return res.status(201).json({ ...pedido[0], items: linhas });
    }

    /* ================================================================
       PAINEL - PEDIDOS
       ================================================================ */
    if (url.startsWith('/api/admin/orders') && metodo === 'GET' && !url.match(/\/\d+$/) && !url.includes('resumo')) {
      const q = busca(bruto);
      let consulta = supabase
        .from('orders').select('*, order_items(*)')
        .order('created_at', { ascending: false }).limit(200);

      if (q.status && q.status !== 'todos') consulta = consulta.eq('status', q.status);
      if (q.data_inicio) consulta = consulta.gte('created_at', q.data_inicio);
      if (q.data_fim) consulta = consulta.lte('created_at', q.data_fim + 'T23:59:59.999Z');

      const { data, error } = await consulta;
      if (error) throw error;
      return res.json(data || []);
    }

    if (url.match(/^\/api\/admin\/orders\/\d+\/status$/) && metodo === 'PUT') {
      const id = url.match(/(\d+)/)[1];
      const { status } = corpo(req);
      const validos = ['novo', 'confirmado', 'separando', 'pronto', 'entregue', 'cancelado'];
      if (!validos.includes(status)) return res.status(400).json({ error: 'Status invalido' });

      const { data, error } = await supabase.from('orders')
        .update({ status, updated_at: new Date().toISOString() }).eq('id', id).select();
      if (error) throw error;
      return res.json(data[0]);
    }

    // Confirmar: da baixa no estoque uma unica vez
    if (url.match(/^\/api\/admin\/orders\/\d+\/confirmar$/) && metodo === 'POST') {
      const id = url.match(/(\d+)/)[1];
      const { forma_pagamento } = corpo(req);

      const { data: pedido, error: e1 } = await supabase
        .from('orders').select('*, order_items(*)').eq('id', id).single();
      if (e1 || !pedido) return res.status(404).json({ error: 'Pedido nao encontrado' });
      if (pedido.status === 'cancelado') return res.status(409).json({ error: 'Pedido cancelado' });
      if (pedido.baixou_estoque) return res.status(409).json({ error: 'Esse pedido ja foi confirmado' });

      for (const item of pedido.order_items || []) {
        const { data: prod } = await supabase
          .from('products').select('peso_saco_kg, estoque_kg, estoque_unidade')
          .eq('id', item.product_id).single();
        if (!prod) continue;

        if (item.tipo_venda === 'unidade') {
          const un = Math.round(Number(item.quantidade_kg) || 0);
          await supabase.from('products')
            .update({ estoque_unidade: Math.max(0, (prod.estoque_unidade || 0) - un) })
            .eq('id', item.product_id);
          await supabase.from('stock_movements').insert([{
            product_id: item.product_id, tipo: 'saida', quantidade_un: -un,
            motivo: `Pedido #${id}`, order_id: Number(id),
          }]);
        } else {
          const kg = item.tipo_venda === 'saco'
            ? (Number(item.quantidade_kg) || 0) * (Number(prod.peso_saco_kg) || 1)
            : (Number(item.quantidade_kg) || 0);
          await supabase.from('products')
            .update({ estoque_kg: Math.max(0, (Number(prod.estoque_kg) || 0) - kg) })
            .eq('id', item.product_id);
          await supabase.from('stock_movements').insert([{
            product_id: item.product_id, tipo: 'saida', quantidade_kg: -kg,
            motivo: `Pedido #${id}`, order_id: Number(id),
          }]);
        }
      }

      const { data } = await supabase.from('orders').update({
        status: 'confirmado',
        baixou_estoque: true,
        forma_pagamento: ['dinheiro', 'pix', 'cartao'].includes(forma_pagamento) ? forma_pagamento : null,
        updated_at: new Date().toISOString(),
      }).eq('id', id).select();

      return res.json(data[0]);
    }

    /* ================================================================
       PAINEL - METRICAS
       ================================================================ */
    if (url.startsWith('/api/admin/resumo') && metodo === 'GET') {
      const agora = new Date();
      const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString();
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();

      const { data, error } = await supabase.from('orders')
        .select('status, subtotal, frete, total, created_at').gte('created_at', inicioMes).limit(3000);
      if (error) throw error;

      const VALE = ['confirmado', 'separando', 'pronto', 'entregue'];
      const zero = () => ({ pedidos: 0, produtos: 0, frete: 0, total: 0 });
      const hoje = zero();
      const mes = zero();
      let aguardando = 0;
      let cancelados = 0;

      for (const p of data || []) {
        if (p.status === 'novo') aguardando++;
        if (p.status === 'cancelado') { cancelados++; continue; }
        if (!VALE.includes(p.status)) continue;

        const somar = (alvo) => {
          alvo.pedidos++;
          alvo.produtos += Number(p.subtotal) || 0;
          alvo.frete += Number(p.frete) || 0;
          alvo.total += Number(p.total) || 0;
        };
        somar(mes);
        if (p.created_at >= inicioDia) somar(hoje);
      }

      const arred = (o) => ({
        pedidos: o.pedidos,
        produtos: centavos(o.produtos),
        frete: centavos(o.frete),
        total: centavos(o.total),
      });

      const { count: totalClientes } = await supabase
        .from('clients').select('id', { count: 'exact', head: true });
      const { count: totalProdutos } = await supabase
        .from('products').select('id', { count: 'exact', head: true }).eq('ativo', 1);

      return res.json({
        hoje: arred(hoje),
        mes: arred(mes),
        aguardando,
        cancelados_mes: cancelados,
        ticket_medio_mes: mes.pedidos > 0 ? centavos(mes.produtos / mes.pedidos) : 0,
        clientes: totalClientes || 0,
        produtos: totalProdutos || 0,
      });
    }

    // Ranking por periodo e por segmento de pet
    if (url.startsWith('/api/admin/ranking') && metodo === 'GET') {
      const q = busca(bruto);
      const dias = Math.min(365, Math.max(1, parseInt(q.dias, 10) || 7));
      const inicio = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();

      const { data: pedidos } = await supabase.from('orders')
        .select('id').gte('created_at', inicio).neq('status', 'cancelado').limit(5000);

      const ids = (pedidos || []).map((p) => p.id);
      if (ids.length === 0) {
        return res.json({
          periodo: { dias, pedidos: 0 },
          total: { faturamento: 0, itens: 0, produtos: 0 },
          ranking: [], sem_classificacao: 0,
        });
      }

      const { data: itens } = await supabase.from('order_items')
        .select('product_id, tipo_venda, quantidade_kg, subtotal').in('order_id', ids).limit(20000);

      const { data: produtos } = await supabase.from('products')
        .select('id, nome, marca, categoria, especie, porte, perfil, peso_saco_kg, estoque_kg, estoque_unidade')
        .limit(3000);

      const porId = {};
      for (const p of produtos || []) porId[p.id] = p;

      const acumulado = {};
      for (const it of itens || []) {
        const p = porId[it.product_id];
        if (!p) continue;
        const linha = acumulado[it.product_id] || (acumulado[it.product_id] = {
          id: p.id, nome: p.nome, marca: p.marca || '', categoria: p.categoria || 'racao',
          especie: p.especie || null, porte: p.porte || null, perfil: p.perfil || null,
          estoque_kg: Number(p.estoque_kg) || 0, estoque_unidade: Number(p.estoque_unidade) || 0,
          vezes: 0, quilos: 0, faturamento: 0,
        });
        linha.vezes += 1;
        linha.faturamento += Number(it.subtotal) || 0;
        const qtd = Number(it.quantidade_kg) || 0;
        if (it.tipo_venda === 'saco') linha.quilos += qtd * (Number(p.peso_saco_kg) || 0);
        else if (it.tipo_venda === 'kg') linha.quilos += qtd;
      }

      let lista = Object.values(acumulado);
      const semClassificacao = lista.filter((l) => !l.especie).length;

      const bate = (campo, valor) => !valor || valor === 'todos' || campo === valor;
      lista = lista.filter((l) => bate(l.especie, q.especie) && bate(l.porte, q.porte)
        && bate(l.perfil, q.perfil) && bate(l.categoria, q.categoria));

      const faturamentoTotal = lista.reduce((s, l) => s + l.faturamento, 0);
      lista.sort((a, b) => b.faturamento - a.faturamento);

      return res.json({
        periodo: { dias, pedidos: ids.length },
        total: {
          faturamento: centavos(faturamentoTotal),
          itens: lista.reduce((s, l) => s + l.vezes, 0),
          produtos: lista.length,
        },
        ranking: lista.slice(0, 40).map((l) => ({
          ...l,
          quilos: Math.round(l.quilos * 10) / 10,
          faturamento: centavos(l.faturamento),
          participacao: faturamentoTotal > 0
            ? Math.round((l.faturamento / faturamentoTotal) * 1000) / 10 : 0,
        })),
        sem_classificacao: semClassificacao,
      });
    }

    /* ================================================================
       PAINEL - PRODUTOS
       ================================================================ */
    if (url === '/api/admin/products' && metodo === 'GET') {
      const { data, error } = await supabase
        .from('products').select('*').eq('ativo', 1).order('nome');
      if (error) throw error;
      return res.json(data || []);
    }

    if (url === '/api/admin/products' && metodo === 'POST') {
      const dados = corpo(req);
      if (!String(dados.nome || '').trim()) return res.status(400).json({ error: 'Informe o nome' });
      const { data, error } = await supabase.from('products').insert([dados]).select();
      if (error) throw error;

      const p = data[0];
      if (Number(p.estoque_kg) > 0 || Number(p.estoque_unidade) > 0) {
        await supabase.from('stock_movements').insert([{
          product_id: p.id, tipo: 'entrada',
          quantidade_kg: Number(p.estoque_kg) || 0,
          quantidade_un: Number(p.estoque_unidade) || 0,
          motivo: 'Cadastro do produto',
        }]);
      }
      return res.status(201).json(p);
    }

    if (url.match(/^\/api\/admin\/products\/\d+$/) && metodo === 'PUT') {
      const id = url.split('/').pop();
      const { data, error } = await supabase.from('products')
        .update({ ...corpo(req), updated_at: new Date().toISOString() }).eq('id', id).select();
      if (error) throw error;
      return res.json(data[0]);
    }

    if (url.match(/^\/api\/admin\/products\/\d+$/) && metodo === 'DELETE') {
      const id = url.split('/').pop();
      await supabase.from('products').update({ ativo: 0 }).eq('id', id);
      return res.json({ ok: true });
    }

    // Entrada de estoque
    if (url.match(/^\/api\/admin\/products\/\d+\/estoque$/) && metodo === 'POST') {
      const id = url.match(/(\d+)/)[1];
      const { quantidade_kg, quantidade_un, motivo } = corpo(req);
      const kg = Number(quantidade_kg) || 0;
      const un = Number(quantidade_un) || 0;
      if (kg <= 0 && un <= 0) return res.status(400).json({ error: 'Informe a quantidade' });

      const { data: prod } = await supabase
        .from('products').select('estoque_kg, estoque_unidade').eq('id', id).single();
      if (!prod) return res.status(404).json({ error: 'Produto nao encontrado' });

      const { data } = await supabase.from('products').update({
        estoque_kg: (Number(prod.estoque_kg) || 0) + kg,
        estoque_unidade: (Number(prod.estoque_unidade) || 0) + Math.round(un),
        updated_at: new Date().toISOString(),
      }).eq('id', id).select();

      await supabase.from('stock_movements').insert([{
        product_id: Number(id), tipo: 'entrada',
        quantidade_kg: kg, quantidade_un: Math.round(un),
        motivo: motivo || 'Reposicao',
      }]);

      return res.json(data[0]);
    }

    /* ================================================================
       PAINEL - CLIENTES E CONFIGURACOES
       ================================================================ */
    if (url === '/api/admin/clients' && metodo === 'GET') {
      const { data, error } = await supabase.from('clients')
        .select('*').order('ultimo_pedido', { ascending: false, nullsFirst: false }).limit(500);
      if (error) throw error;
      return res.json(data || []);
    }

    if (url === '/api/admin/settings' && metodo === 'GET') {
      const { data } = await supabase.from('settings').select('*');
      const obj = {};
      for (const linha of data || []) obj[linha.key] = linha.value;
      return res.json(obj);
    }

    if (url === '/api/admin/settings' && metodo === 'PUT') {
      for (const [key, value] of Object.entries(corpo(req) || {})) {
        await supabase.from('settings').upsert({ key, value: String(value ?? '') }, { onConflict: 'key' });
      }
      return res.json({ ok: true });
    }

    return res.status(404).json({ error: 'Rota nao encontrada' });
  } catch (erro) {
    console.error('API:', erro);
    return res.status(500).json({ error: erro.message });
  }
}
