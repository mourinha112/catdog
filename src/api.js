import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 20000,
});

// Rotas do painel exigem o token; as do catalogo ignoram.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cat_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Sessao expirada: derruba para a tela de login em vez de deixar a tela quebrada.
api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    if (erro.response?.status === 401 && localStorage.getItem('cat_token')) {
      localStorage.removeItem('cat_token');
      localStorage.removeItem('cat_user');
      if (window.location.pathname.startsWith('/admin')) window.location.reload();
    }
    return Promise.reject(erro);
  },
);

export default api;
