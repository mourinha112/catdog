# Cat & Dog Pet Shop — Catálogo Digital

Catálogo de produtos com pedido online e painel administrativo. Um único deploy:

| Endereço | O que é | Login |
|---|---|---|
| `/` | O catálogo, para o cliente final montar e enviar o pedido | não |
| `/admin` | O painel: pedidos, métricas, produtos e configurações | sim |

Não tem PDV, caixa, despesas nem relatórios contábeis — é só o catálogo e o
que serve para tocá-lo.

---

## Subir do zero (uns 15 minutos)

### 1. Criar o Supabase

1. Em [supabase.com](https://supabase.com), **New project**. Guarde a senha do banco.
2. Menu **SQL Editor** → **New query** → cole o conteúdo inteiro de
   `supabase/migrations/001_catalogo.sql` → **Run**.
   Isso cria as tabelas, o balde das fotos e as configurações padrão.
3. Menu **Project Settings → API**. Anote:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public** (a chave que começa com `eyJ...`)

### 2. Subir na Vercel

1. Suba esta pasta para um repositório no GitHub.
2. Na Vercel: **Add New → Project** e escolha esse repositório.
   Ela detecta Vite sozinha; não mude o build command.
3. Antes de clicar em Deploy, abra **Environment Variables** e cadastre:

| Nome | Valor |
|---|---|
| `VITE_SUPABASE_URL` | a Project URL |
| `VITE_SUPABASE_ANON_KEY` | a chave anon |
| `SUPABASE_URL` | a mesma Project URL |
| `SUPABASE_ANON_KEY` | a mesma chave anon |
| `AUTH_SECRET` | um texto longo e aleatório (veja abaixo) |

Para gerar o `AUTH_SECRET`, rode no terminal:

```bash
openssl rand -hex 32
```

Ele é o que assina o login do painel. Se trocar depois, todo mundo é
deslogado — o que não tem problema, é só entrar de novo.

4. **Deploy**.

### 3. Primeiro acesso

Abra `https://seu-projeto.vercel.app/admin`. Como ainda não existe nenhum
usuário, a tela vira **Primeiro acesso** e cria o dono do painel. Depois disso
ela nunca mais aparece.

### 4. Deixar pronto para usar

Dentro do painel:

1. **Configurações** → o nome, endereço, e-mail e CNPJ já vêm preenchidos com os
   dados da loja. **Falta só o WhatsApp** — sem ele, o botão "Falar no WhatsApp"
   não aparece para o cliente no fim do pedido.
2. **Produtos** → cadastre os produtos com foto.
3. Mande o link `https://seu-projeto.vercel.app` para os clientes.

---

## Como o catálogo funciona

O cliente escolhe pra quem é (cão ou gato), filtra por porte e fase, escolhe
**saco fechado** ou **fracionado por kg**, monta o carrinho, escolhe entrega
ou retirada com horário, e envia. Sem cadastro e sem senha: o pedido é achado
depois pelo WhatsApp dele, na aba **Pedidos** do próprio catálogo.

Nome, WhatsApp e endereço ficam guardados no aparelho do cliente, então do
segundo pedido em diante já vem tudo preenchido.

**Preço e estoque são sempre recalculados no servidor** na hora de gravar o
pedido. O navegador só diz o que a pessoa escolheu, nunca quanto custa — se o
preço mudou ou o estoque acabou, o pedido é recusado com a mensagem do que
faltou.

## Como o painel funciona

- **Painel** — quanto entrou hoje e no mês, quantos pedidos esperam resposta,
  ticket médio, e o ranking do que mais vendeu com recorte por período
  (semana / quinzena / mês / 3 meses) e por tipo de pet.
- **Pedidos** — chegam sozinhos (a tela atualiza a cada 30s e o menu mostra a
  bolinha com quantos são novos). Confirmar **dá baixa no estoque uma única
  vez** e marca o pedido; depois é só empurrar o status até Entregue.
- **Produtos** — cadastro com foto (o navegador encolhe, centraliza e tira o
  fundo sozinho quando o fundo é liso), preço por saco e/ou por kg, estoque com
  histórico de entradas, e os campos que fazem os filtros funcionarem.
- **Configurações** — dados da loja, frete e quem acessa o painel.

### Espécie, porte e fase

São esses três campos, no cadastro do produto, que fazem os filtros do
catálogo e os recortes do painel funcionarem. Não precisa preencher tudo de
uma vez: comece pelos produtos que mais vendem. O painel avisa quantos
produtos vendidos ainda estão sem classificação.

---

## Segurança

A senha do painel é guardada com **scrypt e salt** (nunca em texto puro) e o
login usa um **token assinado** que o navegador não consegue forjar. Toda rota
que começa com `/api/admin` exige esse token.

O que ainda dá para melhorar quando o projeto crescer: hoje a chave pública
(`anon`) do Supabase consegue ler as tabelas direto, porque é ela que o
navegador usa para mandar as fotos. Para fechar de vez, crie a variável
`SUPABASE_SERVICE_ROLE_KEY` na Vercel — **a API já prefere essa chave quando
ela existe** — e então apague as policies públicas de `orders`, `clients` e
`users` no Supabase, deixando o `anon` só com o catálogo e o INSERT de pedido.

O histórico do cliente é achado pelo número do WhatsApp, sem senha. Para uma
loja de bairro é o padrão (igual a "consultar pedido pelo CPF"), mas quem
souber o número de outra pessoa vê os pedidos dela. Se isso incomodar, o
caminho é mandar um código por WhatsApp na primeira consulta.

---

## Rodar na sua máquina

```bash
npm install
cp .env.example .env      # preencha com os dados do Supabase
npm run dev               # http://localhost:3000
```

As funções em `/api` só rodam na Vercel. Para testá-las localmente, use
`vercel dev` em vez de `npm run dev`.

---

## Onde fica cada coisa

| Arquivo | O que é |
|---|---|
| `supabase/migrations/001_catalogo.sql` | O banco inteiro |
| `api/index.js` | Toda a API (catálogo, pedidos, painel, login) |
| `src/loja/Loja.jsx` | O catálogo do cliente |
| `src/admin/` | O painel (Painel, Pedidos, Produtos, Configurações) |
| `src/lib/foto.js` | Preparo da foto: encolhe, tira o fundo, envia |
| `src/lib/busca.js` | Busca por palavra, sem acento e sem ligar para plural |
| `marca/` | Os dois arquivos originais da logo, como vieram |

## A marca

Paleta **preto, branco e cinza**, sem nenhuma cor: o que pede ação é preto
sólido, o que já foi resolvido vai clareando em cinza. Os estados de pedido
usam essa mesma escala em vez de cores.

Duas versões da logo, cada uma no fundo certo:

- `public/logo.png` — versão escura, para fundo claro (painel e login)
- `public/logo-branco.png` — versão clara, para fundo escuro (topo do catálogo e rodapé)
- `public/favicon.png` — a casinha recortada do logo, para a aba do navegador

Para trocar a marca depois, basta substituir esses três arquivos mantendo os
nomes.
