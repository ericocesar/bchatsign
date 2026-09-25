---
date: 2026-07-30
title: Redesign de Documentos em Lista e Kanban
---

# Plano executável — Painel e Documentos em lista/Kanban

## Objetivo

Transformar a visualização de documentos do Painel e do menu Documentos em uma experiência moderna de cards, oferecendo duas visualizações do mesmo conjunto de dados:

- **Lista**: preserva a tabela atual e todas as suas capacidades;
- **Kanban**: apresenta somente as três etapas fixas do ciclo documental: **Rascunhos**, **Pendentes** e **Concluídos**.

O Kanban será uma representação visual do ciclo de vida existente, não um novo workflow. Não haverá drag and drop, reordenação manual, retorno de etapa ou atualização em tempo real. Um documento só pode avançar pelo fluxo já permitido:

```text
Rascunho → Pendente → Concluído
```

O avanço de Rascunho para Pendente ocorre pelo fluxo atual de edição/envio. A passagem de Pendente para Concluído ocorre quando o processo de assinatura termina. A interface nunca cria uma mutation para mudar status diretamente, nem permite concluir manualmente um documento.

## Contexto técnico confirmado

O plano se apoia na implementação existente:

- rota atual: `apps/remix/app/routes/_authenticated+/t.$teamUrl+/documents._index.tsx`;
- consulta atual: `trpc.document.findDocumentsInternal`;
- status atuais disponíveis: `DRAFT`, `PENDING`, `COMPLETED`, `REJECTED`, `INBOX` e `ALL`;
- tabela, busca e selector de período já existem;
- tabela atual já concentra as ações por documento em `DocumentsTableActionButton` e `DocumentsTableActionDropdown`;
- stack: React Router/Remix, tRPC/React Query, Tailwind, Radix/Shadcn, Lucide, Framer Motion, Lingui e Playwright;
- tokens de tema e Inter já existem em `packages/ui/styles/theme.css` e `apps/remix/app/app.css`.

Não existe campo de valor financeiro no domínio de documentos. Neste plano, **totais significam quantidade total de documentos** por etapa e no pipeline; não exibir soma monetária artificialmente.

### Status fora do Kanban

`INBOX` e `REJECTED` não pertencem às três etapas solicitadas. Eles permanecem disponíveis na visualização Lista e nos filtros atuais, sem serem descartados ou reclassificados. O Kanban mostra somente Rascunhos, Pendentes e Concluídos. Caso seja necessário exibir Recusados depois, isso deve ser uma decisão de produto separada, não uma quarta coluna implícita.

## Diagnóstico da interface atual e oportunidade

### Pontos preserváveis

- a página Documentos já possui filtros, busca, paginação, seleção em massa e ações maduras;
- o Painel já possui cards de métricas e uma lista de documentos recentes;
- o backend já entrega documentos, paginação e estatísticas por status;
- o design system já tem tema escuro, primitives e estados de loading.

### Problemas a resolver

1. A tabela exige leitura linha a linha e dificulta perceber a distribuição do ciclo documental.
2. O Painel mostra documentos recentes em tabela, em linguagem visual diferente dos cards de métricas.
3. Busca e período estão espalhados no header da página e não representam um agrupamento de controles compacto.
4. As estatísticas atuais são calculadas usando filtros como busca e período; isso conflita com o requisito de totais do pipeline sempre refletirem o conjunto completo.
5. A referência visual fornece atmosfera, mas o uso intenso de amarelo, transparência e textura reduziria a clareza de documentos operacionais.
6. Drag, reordenação e “mover para etapa” seriam enganadores: o status de um documento é governado pelo fluxo de envio e assinatura.

## Conceito visual recomendado

### Dark glass operacional

Usar tema escuro sofisticado, com vidro apenas como estrutura e cards de alto contraste como conteúdo.

1. **Canvas**: azul-carvão quase sólido, sem partículas ou parallax.
2. **Header e toolbar**: vidro fumê moderado, borda fina e blur discreto.
3. **Colunas Kanban**: painéis translúcidos, com acento de etapa em uma barra de 3 px ou ponto.
4. **Cards**: superfície mais opaca que a coluna, borda semitransparente, sombra curta e hierarquia direta.

O efeito 3D fica limitado a hover/foco de card: `translateY(-2px)`, sombra ligeiramente maior e, no máximo, escala `1.01`. Sem rotação de cards, sem reflexos animados e sem grandes superfícies saturadas.

### Paleta inicial

Reutilizar tokens existentes e adicionar tokens semânticos de documentos, sem espalhar `slate-*` ou `white/*` hard-coded.

| Token | Referência dark | Uso |
| --- | --- | --- |
| `--documents-canvas` | `hsl(222 47% 6%)` | fundo da página |
| `--documents-column` | `hsl(222 38% 11% / 0.72)` | coluna Kanban |
| `--documents-card` | `hsl(222 32% 13% / 0.94)` | card |
| `--documents-border` | `hsl(210 40% 98% / 0.10)` | bordas |
| `--documents-text-secondary` | `hsl(214 32% 82%)` | metadados |
| `--documents-focus` | `hsl(var(--primary))` | ring de foco |
| `--documents-draft` | `#38BDF8` | Rascunhos |
| `--documents-pending` | `#FBBF24` | Pendentes |
| `--documents-completed` | `#34D399` | Concluídos |

O tema claro continua funcional com os mesmos tokens semânticos, embora o dark seja a direção principal.

### Tipografia, espaçamento e elevação

- fonte: Inter já existente;
- título de página: 24/30 px desktop, 20/26 px mobile, peso 650–700;
- cabeçalho de coluna: 14/20 px, peso 600;
- título do documento: 14/20 px, peso 600, até duas linhas;
- metadados: 12/16 px, peso 450–500;
- grid de 4 px; padding de página 24/20/16 px para desktop/tablet/mobile;
- coluna: 320–352 px desktop, 288–304 px tablet, raio 18 px;
- card: padding 12–14 px, gap 10–12 px, raio 14 px;
- controles: raio 10 px;
- blur: 14–18 px em chrome/colunas e no máximo 10–12 px em cards;
- card em repouso: sombra `0 6px 18px rgb(0 0 0 / 0.18)`;
- card em hover/foco: sombra `0 10px 28px rgb(0 0 0 / 0.24)`.

Em preferências de redução de transparência ou ambientes de baixo desempenho, substituir blur por fundos opacos. Não sobrepor mais de duas camadas com `backdrop-filter`.

## Descrição visual da tela final

### Menu Documentos

No topo da página, avatar do time e o título “Documentos” ficam à esquerda. À direita, em uma barra única e compacta, aparecem:

1. busca por documento, com ícone `SearchIcon` e campo de texto;
2. botão icon-only `CalendarRangeIcon` que abre filtro de período;
3. toggle segmentado icon-only com `ListIcon` e `Columns3Icon` para Lista/Kanban;
4. botão `RefreshCwIcon` para atualizar manualmente;
5. filtros de remetente já existentes, quando aplicáveis.

Os ícones têm tooltip e `aria-label`. Em telas estreitas, busca ocupa a linha própria e os demais controles ficam em uma segunda linha sticky ou em sheet de filtros.

Em modo Kanban, abaixo da toolbar surgem três colunas de vidro fumê. Cada cabeçalho sticky mostra nome da etapa, contador total e acento de cor. Rascunhos usa cyan, Pendentes usa âmbar e Concluídos usa esmeralda. A cor é apenas acento: nunca um bloco preenchido como na referência.

O card mostra título, status, data de criação, remetente e avatares/nomes dos destinatários. O rodapé apresenta a ação primária atual — Editar para rascunho, Assinar/Aprovar/Visualizar quando aplicável para pendente, Baixar para concluído — e um menu de ações existente. Um card em foco ou hover sobe 2 px; as ações não alteram sua altura.

### Painel

Manter as métricas do Painel e trocar a tabela “Documentos Recentes” por uma grade responsiva de `DocumentPreviewCard`, reutilizando o mesmo núcleo visual do card Kanban. Exibir no máximo cinco cards, ordenados pelo critério atual, e manter “Ver todos” para abrir Documentos. O Painel não duplica a toolbar, nem tenta reproduzir as três colunas; ele é um resumo acionável.

## Arquitetura de informação

### Header de Documentos

| Ordem | Elemento | Comportamento |
| --- | --- | --- |
| 1 | Time + “Documentos” | Mantém contexto e heading `h1`/equivalente |
| 2 | Busca | Busca título, ID externo e destinatários pelo comportamento atual |
| 3 | Filtro de período | Ícone abre popover; opção ativa recebe label e tooltip |
| 4 | Remetente | Preserva filtro atual quando houver time |
| 5 | Toggle Lista/Kanban | Preferência persistida por usuário/time; URL permanece compartilhável |
| 6 | Atualizar | Refetch manual, sem reload completo |

### Busca e período

#### Busca

- reutilizar `DocumentSearch` e reduzir debounce atual de 500 ms para 300 ms, se a observabilidade confirmar ausência de carga excessiva;
- manter `query` em search params;
- limpar busca volta ao conjunto filtrado pelo período/remetente;
- resultado anuncia “N documentos encontrados” em live region.

#### Filtro de período

- substituir o select visível por um trigger icon-only `CalendarRangeIcon` com label “Filtrar por período”;
- abrir popover com presets existentes: Todo o período, 7, 14 e 30 dias;
- incluir intervalos de calendário “De” e “Até” somente quando o backend aceitar `from` e `to` com timezone explícito;
- enquanto o intervalo customizado não existir no contrato, não simular range no cliente: expor apenas os presets reais;
- manter seleção em URL e resetar paginação ao trocar período.

### Toggle de visualização

- componente `DocumentViewToggle` usando `ToggleGroup`/primitivo Radix, não dois botões independentes;
- `ListIcon`: ativa a tabela atual;
- `Columns3Icon`: ativa o board;
- tooltip, `aria-label`, `aria-pressed` e texto acessível “Exibir como lista/Kanban”;
- persistência recomendada: `view=list|kanban` em search params, com fallback em preferência de sessão;
- a Lista é o fallback seguro para `INBOX`, `REJECTED`, seleção em massa, paginação tradicional e telas menores se o usuário a escolher;
- não alterar o status atual quando o usuário só troca a visualização.

### Atualização manual

- componente `DocumentRefreshButton` com `RefreshCwIcon`;
- chama `refetch` da query e invalida apenas `document.findDocumentsInternal` relacionado ao time/pasta atual;
- enquanto atualiza: ícone gira, botão tem `aria-busy`, continua desabilitado e dados atuais permanecem visíveis;
- em sucesso: anunciar “Documentos atualizados”;
- em erro: manter dados anteriores, mostrar toast com “Tentar novamente”;
- não usar polling, websocket ou atualização em tempo real nesta fase.

## Estrutura do Kanban

### Colunas fixas

| Coluna | Fonte | Ação permitida | Ação bloqueada |
| --- | --- | --- | --- |
| Rascunhos | `DocumentStatus.DRAFT` | Editar e enviar pelo fluxo existente | Voltar/mover/reordenar |
| Pendentes | `DocumentStatus.PENDING` | Assinar, aprovar, visualizar, reenviar e compartilhar conforme permissões atuais | Concluir manualmente, voltar/mover/reordenar |
| Concluídos | `DocumentStatus.COMPLETED` | Baixar, visualizar e ações atuais permitidas | Editar, voltar/mover/reordenar |

### Totais do pipeline

Os totais nos cabeçalhos das colunas e no resumo do board precisam refletir **todos os documentos elegíveis do pipeline atual**, não apenas os documentos retornados na página, na busca ou no filtro de data.

Para isso, separar dois conceitos no contrato:

- `pipelineStats`: contagens globais de `DRAFT`, `PENDING`, `COMPLETED` no escopo de time/pasta/permissões, sem `query`, `period`, paginação ou remetente;
- `filteredCount` e `filteredData`: resultado da busca/filtro atual, usado para cards e mensagem de resultado.

Exemplo de cabeçalho com filtro ativo: `Pendentes · 42` como total global e `Exibindo 3 de 42` como contexto filtrado. Assim a métrica do pipeline não “muda de significado” ao pesquisar.

### Carregamento dos cards

O endpoint atual retorna uma lista paginada e um único status por query. Para que o board não misture páginas nem esconda etapas, criar uma consulta específica, por exemplo `document.findPipelineDocuments`, ou executar três consultas de status com paginação independente, após avaliar o volume.

Contrato recomendado:

```ts
type FindPipelineDocumentsRequest = {
  teamId?: number;
  folderId?: string;
  query?: string;
  period?: '7d' | '14d' | '30d';
  senderIds?: number[];
  cursors?: Partial<Record<'DRAFT' | 'PENDING' | 'COMPLETED', string>>;
};

type FindPipelineDocumentsResponse = {
  pipelineStats: Record<'DRAFT' | 'PENDING' | 'COMPLETED', number>;
  columns: Record<'DRAFT' | 'PENDING' | 'COMPLETED', {
    data: TDocumentMany[];
    filteredCount: number;
    nextCursor?: string;
  }>;
};
```

O formato final deve respeitar as convenções de schemas Zod, tRPC e rotas do projeto. Não introduzir cache em tempo real nem carregar todos os documentos de uma vez. Começar com 20 cards por coluna e “Carregar mais”; considerar virtualização apenas após medir datasets reais.

### Card de documento

#### Sempre visível

1. ícone de documento e status textual;
2. título do documento;
3. data de criação;
4. remetente, quando visível no contexto atual;
5. destinatários em avatar stack com tooltip/nome acessível;
6. ação primária existente;
7. menu contextual atual.

#### Modo compacto e detalhado

O primeiro release pode usar uma densidade única para diminuir risco. Se o modo compacto/detalhado for incluído:

- compacto: título, status, criação, até três avatares e ação principal;
- detalhado: adiciona remetente por extenso, total de destinatários, último evento disponível e labels complementares;
- ambos preservam o mesmo menu e mesma ação primária;
- o modo não deve ocultar informação necessária para entender o status.

#### Navegação e ações

- clicar no título abre o destino atual: editor para quem pode gerenciar, tela de assinatura para destinatário, texto sem link quando sem permissão;
- `Editar`, `Assinar`, `Aprovar`, `Visualizar` e `Baixar` reutilizam a lógica de `DocumentsTableActionButton`;
- menu reutiliza `DocumentsTableActionDropdown` ou extrai seu conteúdo para um componente compartilhado;
- ações como renomear, duplicar, mover de pasta, excluir/ocultar, links de assinatura, reenviar e compartilhar não podem desaparecer no Kanban;
- ação de pasta é independente de etapa e permanece no menu.

## Componentes reutilizáveis

### Em `apps/remix/app/components/general/document/`

- `document-view-toggle.tsx`
- `document-toolbar.tsx`
- `document-date-filter.tsx`
- `document-refresh-button.tsx`
- `document-kanban-board.tsx`
- `document-kanban-column.tsx`
- `document-kanban-card.tsx`
- `document-preview-card.tsx`
- `document-card-actions.tsx`
- `document-kanban-states.tsx`
- `document-pipeline.types.ts`

### Em `packages/ui`, apenas se forem genéricos

- toggle com tooltip padronizado;
- card de superfície glass neutro;
- skeleton de board;
- live region utilitária.

O componente de domínio não deve ir para `packages/ui` apenas por ser visualmente bonito. Manter lógica de documento, permissões e rotas no app. Usar `type`, exports nomeados, Lingui e tokens semânticos.

## Estados de interação

| Componente | Default | Hover | Foco | Loading | Empty/Error |
| --- | --- | --- | --- | --- | --- |
| Toggle | ícone neutro | fundo discreto | ring de 2 px | desabilitado apenas em transição de view | mantém view anterior em erro |
| Busca | ícone + campo | borda mais clara | ring visível | spinner após debounce | “Nenhum documento encontrado” |
| Filtro de data | ícone de calendário | superfície elevada | ring + tooltip | opções aguardam consulta | limpar período e tentar novamente |
| Atualizar | `RefreshCwIcon` | fundo discreto | ring | ícone gira; sem apagar dados | toast com retry |
| Coluna | vidro fumê | sem salto | ações do header focáveis | skeleton de cards | empty contextual por etapa |
| Card | alto contraste | sobe 2 px | ring + ações visíveis | skeleton de mesma altura | erro não remove card anterior |
| Menu | fechado | item destacado | foco por teclado | item com spinner | mensagem de erro vinculada ao toast/dialog |

Estados obrigatórios da página:

- carregamento inicial de board com três colunas e skeletons;
- atualização manual sem flash de página;
- nenhuma correspondência para busca/filtro;
- coluna realmente vazia;
- erro total e erro parcial por coluna;
- documento sem avatar ou destinatário;
- documento com título longo;
- usuário sem permissão para editar/compartilhar;
- `INBOX`/`REJECTED` quando o usuário alterna para Lista;
- tela pequena e zoom de 200%.

## Responsividade

### Desktop amplo — ≥ 1440 px

- três colunas de 320–352 px visíveis;
- toolbar em uma linha;
- busca com largura entre 240 e 320 px;
- cabeçalhos das colunas sticky dentro do board.

### Desktop/tablet — 768–1439 px

- board com rolagem horizontal explícita e colunas de 288–320 px;
- toolbar pode quebrar para duas linhas;
- filtros e toggle continuam no topo;
- nenhuma tentativa de comprimir três colunas em cards estreitos.

### Mobile — < 768 px

- uma coluna por vez;
- seletor horizontal sticky de Rascunhos, Pendentes e Concluídos com total global;
- busca em largura total;
- filtro, toggle e atualizar em linha de ícones, todos com área mínima de 44 × 44 px;
- a Lista continua acessível pelo toggle;
- não há drag nem gesto de movimentação;
- detalhes e menus abrem em sheet de tela cheia quando necessário;
- posição de scroll é preservada por etapa ao alternar.

## Acessibilidade

Meta: WCAG 2.2 AA.

- contraste de texto normal ≥ 4.5:1 e de componentes/foco ≥ 3:1;
- `main`, heading de página e regiões nomeadas para Lista e Board;
- colunas nomeadas com título e contador; cards organizados como listas;
- status sempre em texto + ícone/forma, nunca apenas em cor;
- controles icon-only com tooltip e nome acessível;
- foco 2 px visível com offset;
- card não é um botão gigante contendo outros botões; título/link e ações internas são focáveis separadamente;
- menus e sheets têm focus trap e devolvem foco ao trigger;
- busca anuncia resultado e refresh anuncia sucesso/erro em live region;
- alvos touch mínimos de 44 × 44 px;
- `prefers-reduced-motion` remove deslocamento, escala e rotação; o refresh pode comunicar loading por texto/spinner estático;
- zoom de 200% sem conteúdo cortado;
- nenhuma funcionalidade depende de hover, cor, drag ou atualização automática.

## Estratégia de transição de status

Não usar drag and drop. Não usar botão “mover para coluna”. Não permitir retorno.

| Origem | Gatilho visual no card | Resultado permitido |
| --- | --- | --- |
| Rascunho | `Editar` abre o fluxo atual de editor/envio | Só após envio válido muda para Pendente |
| Pendente | `Assinar`, `Aprovar`, `Visualizar` ou `Reenviar`, conforme função/permissão | Só após conclusão real da assinatura muda para Concluído |
| Concluído | `Baixar`/visualizar | Permanece concluído |

Depois de uma ação que pode mudar status, invalidar `document.findPipelineDocuments`, `document.findDocumentsInternal` e os dados recentes do dashboard. A animação é um crossfade curto de saída/entrada após confirmação do servidor; não é otimista para status crítico de assinatura.

## Fases de implementação

### Fase 1 — Fundação visual e design system — P0

1. Criar matriz de paridade: tabela atual, menu de ações, ações em massa, Painel e nova visualização.
2. Adicionar tokens de Documento/Kanban em `packages/ui/styles/theme.css`, incluindo versões light.
3. Definir `DocumentCard` compartilhado entre Painel e Kanban.
4. Extrair as ações da tabela para `DocumentCardActions`, preservando toda a lógica de permissão e destino.
5. Capturar baseline visual do Painel e Documentos.

**Aceite da fase:** nenhum comando existente da tabela fica sem equivalente; cards usam tokens, Inter, Lucide e foco visível.

### Fase 2 — Estrutura do pipeline — P0

1. Criar `findPipelineDocuments` e `pipelineStats` globais, validados por Zod.
2. Garantir que `pipelineStats` ignore busca, período, remetente e paginação, preservando team/pasta/permissão.
3. Implementar `DocumentKanbanBoard` e as três colunas fixas.
4. Implementar carregamento por coluna, skeleton, vazio, erro e “Carregar mais”.
5. Manter Lista como implementação existente e fallback.

**Aceite da fase:** os totais globais coincidem com a fonte de dados; cards filtrados não distorcem totais; não há DnD ou ordem manual.

### Fase 3 — Redesign dos cards — P0

1. Implementar card com título, status, criação, remetente, destinatários e ações.
2. Reutilizar avatar stack e toda a lógica de permissões/destinos atuais.
3. Implementar `DocumentPreviewCard` para a seção de recentes do Painel.
4. Substituir a tabela de recentes do Painel por grade de até cinco cards e CTA “Ver todos”.
5. Validar conteúdo extremo, ausência de avatar e permissões.

**Aceite da fase:** Painel e Kanban reutilizam o mesmo padrão de card; nenhuma ação atual é perdida.

### Fase 4 — Interações e controles — P0

1. Criar toggle Lista/Kanban no header de Documentos com preferência em URL.
2. Consolidar busca, filtro de período, remetente e refresh na toolbar.
3. Evoluir o período de select visível para popover icon-only; manter presets existentes.
4. Adicionar range de datas apenas depois da extensão server-side `from`/`to` e testes de timezone.
5. Implementar refresh manual sem polling/realtime.
6. Adicionar animações curtas de hover, expansão de menu e atualização confirmada.

**Aceite da fase:** busca, filtro, toggle e refresh funcionam por mouse, teclado e toque, mantendo search params.

### Fase 5 — Responsividade e acessibilidade — P0 antes do release

1. Implementar layout de uma coluna com seletor de etapa no mobile.
2. Mover filtros secundários para sheet no mobile quando necessário.
3. Auditar semântica, foco, live regions, contraste e zoom.
4. Implementar reduced motion e fallback de transparência.
5. Testar dark e light mode.

**Aceite da fase:** 320 px, 768 px, 1440 px e zoom 200% funcionam sem perda de ações; não existe dependência de drag ou hover.

### Fase 6 — Testes e refinamentos — P0/P1

1. Unit tests para schemas, separação entre `pipelineStats` e resultado filtrado, formatação e mapping de colunas.
2. Testes de componentes para todas as variantes de card, toggle, filtro e refresh.
3. Playwright para Lista/Kanban, busca, período, refresh, ações por status, permissões, empty/loading/error e mobile.
4. Visual regression em 390 × 844, 768 × 1024, 1440 × 900 e 1920 × 1080, em dark e light.
5. Medir performance com 20, 100 e 200 documentos; aplicar virtualização somente se necessário.
6. Rollout com feature flag para uso interno antes da substituição completa da visualização de recentes do Painel.

## Critérios objetivos de aceite

### Paridade funcional

- Lista mantém tabela, filtros, paginação, seleção em massa e todas as ações atuais.
- Kanban contém exatamente Rascunhos, Pendentes e Concluídos.
- `INBOX` e `REJECTED` continuam acessíveis na Lista e não são perdidos.
- Nenhum card pode ser arrastado, reordenado, movido manualmente ou devolvido a etapa anterior.
- Rascunho só vira Pendente via fluxo existente de envio; Pendente só vira Concluído após evento real de conclusão.
- Menu do card preserva editar, renomear, baixar, duplicar, salvar como modelo, pasta, excluir/ocultar, links, reenviar e compartilhar conforme status/permissão.

### Dados e totais

- Total de cada coluna é global no escopo de team/pasta/permissões e não muda com busca, período, remetente ou paginação.
- Cards exibidos obedecem busca, período e remetente.
- A interface informa quantos cards filtrados são exibidos sem confundir com o total global.
- Refresh não apaga dados existentes e reflete a resposta mais recente do servidor.

### Interações

- Toggle alterna Lista/Kanban sem perder busca/filtros.
- Busca por título, ID externo ou destinatário mantém o comportamento atual.
- Filtro de período abre pelo ícone e seus presets funcionam; intervalos customizados só aparecem quando suportados pelo servidor.
- Botão de refresh anuncia loading, sucesso e erro adequadamente.
- Não há polling ou conexão em tempo real.

### Visual e responsividade

- Cards têm contraste maior que colunas; nenhum texto essencial depende de transparência alta.
- Blur máximo 20 px e sem partículas, parallax ou animações ociosas.
- Hover de card não excede 2 px e não causa reflow.
- Em 320 px, não há overflow do documento/página fora de áreas intencionalmente roláveis.
- Em mobile, as três etapas e o modo Lista são alcançáveis por teclado e toque.

### Acessibilidade e qualidade

- Zero violações axe critical/serious nos estados principais.
- Contraste WCAG 2.2 AA e foco visível em todos os controles.
- Todos os controles icon-only têm nome acessível e tooltip.
- As ações de status podem ser usadas sem mouse.
- `prefers-reduced-motion` remove animações espaciais.
- CLS < 0.1; INP alvo < 200 ms no perfil de produção; skeleton preserva a geometria final.

## Decisões já fechadas

- Kanban ainda não existe e será criado a partir de Documentos.
- Painel usará cards de prévia, não uma cópia completa do board.
- Etapas fixas: Rascunhos, Pendentes e Concluídos.
- Sem reordenação.
- Sem drag and drop.
- Sem retorno de etapa.
- Sem atualização em tempo real.
- Totais representam todo o pipeline, em quantidade de documentos.
- Header de Documentos terá busca, filtro de período, toggle Lista/Kanban e refresh.
- Não há métricas históricas de design; o baseline visual e métricas técnicas desta implementação serão a referência para iterações futuras.
