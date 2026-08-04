# Método Certo: Personal Finance, Simplified

Prompt de Desenvolvimento – Método Certo (PWA)

Visão Geral

Desenvolva um sistema web moderno chamado Método Certo, um Progressive Web App (PWA) para controle financeiro pessoal inteligente.

O sistema deverá possuir aparência semelhante a uma aplicação nativa (mobile-first), podendo ser instalado no Android, iPhone, Windows e macOS através do navegador.

O objetivo é fornecer ao usuário uma plataforma completa para gerenciamento financeiro, planejamento de metas, investimentos e análises inteligentes utilizando Inteligência Artificial.

Tecnologias

Utilize a seguinte stack:

Front-end

React 19

TypeScript

Vite

React Router

Tailwind CSS

Shadcn/UI

Framer Motion

Recharts

React Query (TanStack Query)

React Hook Form

Zod

Axios

PWA (Vite Plugin PWA)

Back-end

Node.js

NestJS

PostgreSQL

Prisma ORM

JWT

Redis

BullMQ

Firebase Cloud Messaging

OpenAI API

Características do PWA

O sistema deve funcionar como aplicativo instalado.

Implementar:

Instalação no Android e iPhone

Funcionamento Offline

Cache Inteligente

Atualizações automáticas

Splash Screen

Manifest.json

Ícones em vários tamanhos

Push Notifications

Background Sync

Service Worker

Design

Inspirado em:

Nubank

Inter

Notion

Linear

Stripe Dashboard

Visual moderno.

Minimalista.

Muito fluido.

Animações suaves.

Glassmorphism leve.

Cards arredondados.

Bordas suaves.

Muito espaço entre elementos.

Identidade Visual

Nome:

Método Certo

Slogan:

Suas finanças, seu futuro.

Paleta

Primária

Verde

#2ECC71


Secundária

Azul

#1565C0


Apoio

Laranja

#FF9800


Fundos

#FFFFFF
#F5F7FA
#EEF2F6


Texto

#1E293B
#64748B


Ícones

Seguir o mesmo padrão criado para o aplicativo.

Utilizar ícones outline modernos.

Exemplos:

Carteira

Crescimento financeiro

Gráfico

Cofre

Investimentos

Cartão

PIX

Banco

Calendário

Relatórios

IA

Metas

Economia

Configurações

Tipografia

Fonte

Inter

Pesos

300

400

500

600

700

Layout

Sidebar recolhível

Header fixo

Conteúdo central

Responsivo

Dark Mode

Light Mode

Estrutura das páginas

Login

Tela moderna com:

Logo

Nome

Imagem ilustrativa financeira

Login

Senha

Lembrar acesso

Entrar

Google

Apple

Esqueci senha

Cadastrar

Dashboard

Mostrar:

Saldo Atual

Receitas

Despesas

Patrimônio

Investimentos

Fluxo de Caixa

Metas

Contas vencendo

Cartões

Resumo da IA

Receitas

Cadastro

Categorias

Filtros

Pesquisa

Anexos

Recorrência

Despesas

Cadastro

Parcelamentos

Recorrência

Categoria

Centro de custo

Comprovantes

Status

Contas Bancárias

Saldo

Extrato

Transferências

Open Finance

PIX

Cartões

Limite

Disponível

Faturas

Parcelas

Gráfico de utilização

Investimentos

Tesouro

CDB

LCI

LCA

Fundos

ETF

Ações

FII

Cripto

Dividendos

Rentabilidade

Patrimônio

Metas

Criar metas

Valor

Prazo

Economia mensal

Barra de progresso

Simulações

Relatórios

Mensal

Anual

Categorias

Comparativos

Exportar

PDF

Excel

CSV

Inteligência Artificial

Criar um assistente chamado

Certo IA

Chat semelhante ao ChatGPT.

Perguntas:

Quanto posso gastar?

Estou economizando?

Como investir?

Quais gastos cortar?

Quanto sobra este mês?

Qual minha previsão?

Como melhorar minhas finanças?

A IA deverá:

Analisar histórico.

Identificar padrões.

Detectar desperdícios.

Gerar previsões.

Criar planejamentos.

Gerar insights automaticamente.

Dashboard Inteligente

A IA gera automaticamente cards como:

"Você gastou 14% mais em alimentação."

"Sua energia aumentou."

"Você pode economizar R$ 280."

"Seu patrimônio cresceu 4%."

"Você está próximo da meta."

Open Finance

Integração completa.

Sincronizar:

Bancos

PIX

Cartões

Investimentos

Empréstimos

Financiamentos

Extratos

Notificações

Push

Toast

Email

Alertas para:

Conta vencendo

Cartão

Meta

Investimento

Recebimento

Saldo baixo

Segurança

JWT

Refresh Token

Biometria (WebAuthn quando suportado)

2FA

HTTPS

LGPD

Criptografia

Logs

Auditoria

Dashboard Administrativo

Usuários

Planos

Assinaturas

Financeiro

Logs

Analytics

Configurações

Monitoramento

Performance

Lazy Loading

Code Splitting

React Query Cache

Virtualização de listas

Otimização de imagens

Compressão

SEO

Lighthouse acima de 95

Acessibilidade

Seguir WCAG 2.2 AA

Suporte a teclado

Alto contraste

ARIA

Responsividade completa

Diferenciais

Instalação como aplicativo (PWA).

Funcionamento offline para consultas e lançamentos locais, sincronizando automaticamente quando houver conexão.

Inteligência Artificial integrada para análise financeira personalizada.

Integração com Open Finance.

Dashboard moderno e altamente interativo.

Animações suaves com excelente desempenho.

Interface premium inspirada nos melhores produtos financeiros do mercado.

Objetivo Final

Criar um Progressive Web App (PWA) moderno, rápido e seguro, com experiência equivalente a um aplicativo nativo. O Método Certo deve atuar como um consultor financeiro inteligente, ajudando os usuários a controlar receitas e despesas, acompanhar investimentos, atingir metas financeiras e tomar decisões mais assertivas por meio de Inteligência Artificial.

O sistema deve ser desenvolvido seguindo princípios de Clean Architecture, Componentização, Design System, SOLID, Clean Code, Testes Automatizados (unitários e de integração) e documentação clara, permitindo evolução contínua, alta escalabilidade e facilidade de manutenção.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/49fca9a0-f6df-4f94-b252-7cd203e6be41).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
