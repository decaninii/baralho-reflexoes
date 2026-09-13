# Baralho de Reflexões — passo a passo para colocar no ar hoje

Este projeto já vem com: as 150 frases (15 temas), login por link mágico,
favoritos e assinatura ligados ao Supabase, paywall (3 temas grátis, resto
exige assinatura), integração com Mercado Pago (assinatura recorrente) e
a base de PWA/push (o disparo diário automático fica para depois — ver
"Próximos passos" no fim).

## 0. Pré-requisito
Instale o Node.js (18+) na sua máquina, se ainda não tiver.

## 1. Subir para o GitHub
```bash
cd baralho-nextjs
git init
git add .
git commit -m "MVP em Next.js com Supabase e Mercado Pago"
gh repo create baralho-de-reflexoes --private --source=. --push
```
(Se não tiver o `gh` instalado, crie o repositório manualmente no site do
GitHub e siga as instruções de "push an existing repository".)

## 2. Criar o projeto no Supabase
1. Acesse supabase.com → **New project**
2. Depois de criado, vá em **SQL Editor** → cole o conteúdo de
   `supabase/schema.sql` → **Run**. Isso cria as tabelas de perfis,
   favoritos, assinaturas e push, com as permissões corretas.
3. Vá em **Project Settings → API** e copie:
   - `Project URL` → vai virar `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → vira `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → vira `SUPABASE_SERVICE_ROLE_KEY` (**nunca** exponha
     essa no frontend — só é usada nas rotas de servidor)
4. Vá em **Authentication → URL Configuration** e adicione a URL do seu
   site Vercel (você vai ter isso no passo 4) em "Redirect URLs", terminando
   em `/auth/callback`.

## 3. Configurar o Mercado Pago
1. Acesse o painel de Developers do Mercado Pago
2. Em **Suas integrações**, crie uma aplicação
3. Pegue o **Access Token de TESTE** primeiro (nunca comece direto em produção)
4. Configure um webhook apontando para `https://SEU-DOMINIO/api/mp-webhook`
   (você só vai ter o domínio depois do passo 4 — pode voltar aqui e
   configurar depois)
5. Só depois de testar uma assinatura de ponta a ponta em modo sandbox,
   troque o Access Token para o de **produção**

## 4. Deploy no Vercel
1. Acesse vercel.com → **Add New Project** → importe o repositório do GitHub
2. Em **Environment Variables**, adicione todas as chaves do arquivo
   `.env.example` com os valores reais:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `MERCADOPAGO_ACCESS_TOKEN` (comece com o de teste)
   - `NEXT_PUBLIC_SITE_URL` → coloque a URL que o Vercel vai te dar
     (ex: `https://baralho-de-reflexoes.vercel.app`) — dá pra editar essa
     variável e fazer um novo deploy depois que a URL existir
3. Clique em **Deploy**
4. Volte no Supabase (passo 2.4) e no Mercado Pago (passo 3.4) e cole a
   URL final do Vercel nos lugares certos

## 5. Testar o fluxo completo (antes de divulgar)
1. Acesse o site publicado, entre com seu e-mail (chega um link mágico)
2. Veja se os 3 temas grátis abrem normalmente e os outros aparecem com 🔒
3. Clique em "Assinar" → deve abrir o checkout do Mercado Pago (modo teste)
4. Use um **cartão de teste** do Mercado Pago (a documentação deles lista
   os números de cartão de teste) para simular a aprovação
5. Confirme no Supabase (tabela `subscriptions`) se o status mudou para
   `active` depois do webhook disparar
6. Só então troque para o Access Token de produção e faça o teste real de
   R$0,05 com uma pessoa de confiança, como vocês já fizeram no outro app

## 6. Teste fechado
Chame de 10 a 20 pessoas de confiança, valide se o login, o paywall e a
cobrança funcionam sem erro antes de divulgar mais amplamente.

## Próximos passos (não incluídos ainda)
- **Notificação push diária de verdade**: o Service Worker (`public/sw.js`)
  já sabe *mostrar* uma notificação — falta (a) o botão no app para o
  usuário aceitar notificações e salvar a inscrição na tabela
  `push_subscriptions`, e (b) um Vercel Cron Job que roda 1x por dia,
  busca as inscrições e dispara via `web-push`. Posso montar isso na
  próxima rodada.
- **Ícones do PWA**: adicione `icon-192.png` e `icon-512.png` em `public/`
  (o manifest já aponta pra eles).
- **Completar as 30 frases por tema**: seguimos incrementando
  `lib/themes.js` tema por tema.
