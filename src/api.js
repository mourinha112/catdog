import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 20000,
});

// Rotas do painel exigem o token; as do catalogo ignoram.
// O localStorage lanca excecao quando o navegador bloqueia dados do site.
// Sem o try, toda requisicao do painel morria antes de sair.
function pegarToken() {
  try { return localStorage.getItem('cat_token'); } catch (_) { return null; }
}

api.interceptors.request.use((config) => {
  const token = pegarToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Sessao expirada: derruba para a tela de login em vez de deixar a tela quebrada.
api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    if (erro.response?.status === 401 && pegarToken()) {
      try {
        localStorage.removeItem('cat_token');
        localStorage.removeItem('cat_user');
      } catch (_) { /* ignora */ }
      window.location.reload();
    }
    return Promise.reject(erro);
  },
);

export default api;
