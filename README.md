# N.P.M. · Núcleo Preparatório Militar

Painel do **NPM do Exército de Solano** (One State RP): cadastro dos efetivos em treinamento e nível de cada um
(**Iniciante**, **Avançado** ou **Setorizar**). Quem é marcado como *Setorizar* aparece no painel do
**TEN-GEN / SETORES**, que escolhe o setor de destino. O NPM vê na aba **Enviados** para onde cada um foi.

Usa o **mesmo Supabase** do rpcontrol e do TEN-GEN, com contas **próprias do NPM** (separadas do rpcontrol).

## 1. Criar as tabelas no Supabase (uma vez)
Supabase → **SQL Editor** → **New query** → cole todo o `supabase/schema.sql` → **Run**.

## 2. Publicar no GitHub Pages
Repositório → **Settings → Pages** → *Deploy from a branch* → **main** / **(root)** → **Save**.

## 3. Primeiro acesso
- Abra o link e toque em **Criar conta** (nome no jogo + senha).
- **A primeira conta criada vira administradora.** As próximas ficam aguardando aprovação na aba **Equipe**.
- O administrador pode aprovar, recusar, remover e tornar outra pessoa administradora.

## Como funciona
- **Efetivos:** cadastro (QRA, DC, data de entrada, recrutado por, observação) e nível com um toque.
- **Enviados:** quem o TEN-GEN já enviou para um setor (Sul, Norte, Centro, Leste).
- **Equipe:** contas do NPM.
- O NPM **não** consegue mudar o setor de destino; só o TEN-GEN. Nada aqui altera o rpcontrol.

## Instalar como app no celular
- **iPhone (Safari):** Compartilhar → **Adicionar à Tela de Início**.
- **Android (Chrome):** menu ⋮ → **Instalar app**.

## Arquivos
- `index.html`, `style.css`, `app.js`: o painel · `logo.svg`: brasão do NPM
- `config.js`: URL e chave publishable do Supabase (pública por natureza)
- `sw.js`: abre rápido e funciona como app (os dados sempre vêm do banco)
- `supabase/schema.sql`: tabelas e regras de segurança
