import React, { Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';

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
    <Suspense fallback={null}>
      {noAdmin ? <Admin /> : <Loja />}
    </Suspense>
  );
}
