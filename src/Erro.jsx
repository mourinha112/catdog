import React from 'react';

/*
 * Rede de seguranca: se qualquer tela quebrar, o React por padrao apaga a
 * pagina inteira e o usuario ve so branco, sem pista nenhuma. Aqui ele ve
 * uma mensagem, um botao de recarregar e o detalhe do erro para mandar
 * para o suporte.
 */
export default class Erro extends React.Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    console.error('Falhou:', erro, info);
  }

  render() {
    if (!this.state.erro) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem', background: '#E8E8E8',
        fontFamily: "'Segoe UI', -apple-system, system-ui, sans-serif", color: '#171717',
      }}>
        <div style={{
          maxWidth: 460, width: '100%', background: '#fff',
          borderRadius: 20, padding: '2rem 1.75rem', textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.14)',
        }}>
          <img src="/logo.png" alt="" style={{ width: 84, marginBottom: '1rem' }} />
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Algo travou por aqui
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#767676', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            A página não conseguiu carregar. Recarregar costuma resolver — se
            continuar, mande o texto abaixo para o suporte.
          </p>

          <button
            onClick={() => window.location.reload()}
            style={{
              width: '100%', minHeight: 46, border: 0, borderRadius: 12,
              background: '#111111', color: '#fff', fontSize: '0.95rem',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Recarregar a página
          </button>

          <pre style={{
            marginTop: '1.25rem', padding: '0.75rem', textAlign: 'left',
            background: '#F5F5F5', borderRadius: 10, fontSize: '0.72rem',
            color: '#5A5A5A', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            maxHeight: 150, overflow: 'auto',
          }}>
            {String(this.state.erro?.message || this.state.erro)}
          </pre>
        </div>
      </div>
    );
  }
}
