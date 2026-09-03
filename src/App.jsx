import React from 'react';
import { useLocation } from 'react-router-dom';
import Erro from './Erro';
import Loja from './loja/Loja';
import Admin from './admin/Admin';

/*
 * Tudo num arquivo so, de proposito.
 *
 * Antes o painel e a loja vinham em pedacos separados, baixados sob
 * demanda. Isso e mais leve, mas cria um segundo download que pode nao
 * chegar - e quando nao chega, a tela fica parada sem erro nenhum. Foi o
 * que aconteceu: o catalogo abria e o painel nao, na mesma maquina.
 *
 * Com import direto existe um unico arquivo: se a pagina abre, ela abre
 * inteira. Custa alguns kb a mais e elimina a classe inteira de problema.
 *
 * Duas partes no mesmo deploy:
 *
 *   /        -> catalogo publico, sem login (o cliente fazendo o pedido)
 *   /admin   -> painel do lojista, atras de login
 *
 * Cada uma carrega so o seu pedaco: quem abre o catalogo no celular nao
 * baixa o painel junto.
 */
export default function App() {
  const { pathname } = useLocation();
  const noAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

  return (
    <Erro>
      {noAdmin ? <Admin /> : <Loja />}
    </Erro>
  );
}
