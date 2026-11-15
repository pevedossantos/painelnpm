# N.P.M. · Núcleo Preparatório Militar

Painel do **NPM do Exército de Solano** (One State RP): cadastro dos efetivos em treinamento e nível de cada um
(**Iniciante**, **Avançado** ou **Setorizar**). Quem é marcado como *Setorizar* aparece no painel do
**TEN-GEN / SETORES**, que escolhe o setor de destino. O NPM vê na aba **Enviados** para onde cada um foi.

Usa o **mesmo Supabase** do rpcontrol e do TEN-GEN, com contas **próprias do NPM** (separadas do rpcontrol).

## 1. Criar as tabelas no Supabase (uma vez)
Supabase → **SQL Editor** → **New query** → cole todo o `supabase/schema.sql` → **Run**.

## 2. Publicar no GitHub Pages
Repositório → **Settings → Pages** → *Deploy from a branch* → **main** / **(root)** → **Save**.

## 3. Primeiro acesso (conta única)
- O responsável abre o link e cria a conta (QRA + senha). O QRA aparece no cabeçalho, com MAJ-GEN e Exército de Solano.
- **O painel tem uma conta só:** depois da primeira, a opção de criar conta some.
- Na aba **Perfil** dá para trocar a foto do cabeçalho.

## Como funciona
- **Efetivos:** cadastro (QRA, DC, data de entrada, recrutado por, observação) e nível com um toque.
- **Enviados:** quem o TEN-GEN já enviou para um setor (Sul, Norte, Centro, Leste).
- **Perfil:** foto do responsável e sair da conta.
- O NPM **não** consegue mudar o setor de destino; só o TEN-GEN. Nada aqui altera o rpcontrol.

## Instalar como app no celular
- **iPhone (Safari):** Compartilhar → **Adicionar à Tela de Início**.
- **Android (Chrome):** menu ⋮ → **Instalar app**.

## Arquivos
- `index.html`, `style.css`, `app.js`: o painel · `logo.jpg`: logo do NPM
- `config.js`: URL e chave publishable do Supabase (pública por natureza)
- `sw.js`: abre rápido e funciona como app (os dados sempre vêm do banco)
- `supabase/schema.sql`: tabelas e regras de segurança
