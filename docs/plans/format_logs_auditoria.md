Ajuste a seção "Log de Auditoria" do certificado para que todos os eventos caibam em uma única página A4.

Requisitos:
1. Manter o cabeçalho da seção com:
   - ID do Envelope
   - Título "Log de Auditoria"
   - Status
   - Fuso horário
   - Criado em
   - Última atualização
   - Documentos incluídos
   - Destinatários

2. Reduzir o bloco inicial de metadados:
   - Usar fonte entre 7px e 8px.
   - Exibir os dados em grid de 2 colunas.
   - Remover espaçamentos verticais excessivos.
   - Quebrar textos longos com line-height compacto.

3. Renderizar os eventos de auditoria em 2 colunas.
   - Cada evento deve ser um card compacto.
   - Fonte do título do evento: 7.5px a 8px.
   - Fonte dos detalhes: 6.5px a 7px.
   - Padding do card: 5px a 6px.
   - Gap entre cards: 4px a 6px.
   - Border-radius discreto: 4px.
   - Borda cinza clara.

4. Em cada card de evento, exibir:
   - Tipo do evento em destaque.
   - Descrição curta.
   - Data/hora local.
   - UTC em linha menor.
   - Usuário.
   - IP.
   - Agente de usuário.

5. Evitar que um card quebre entre colunas ou páginas:
   - Usar `break-inside: avoid`.
   - Usar `page-break-inside: avoid`.

6. Remover repetições visuais:
   - Não repetir o título "Log de Auditoria" em múltiplas páginas.
   - Não deixar grandes margens entre eventos.
   - Compactar labels como:
     - "USUÁRIO" → "Usuário"
     - "ENDEREÇO IP" → "IP"
     - "AGENTE DE USUÁRIO" → "Agente"

7. A página deve continuar legível em PDF.
   - Usar fonte sans-serif.
   - Tamanho mínimo recomendado: 6.5px.
   - Não cortar informações.
   - Se houver muitos eventos futuros, reduzir fonte até 6px antes de criar nova página.

8. Objetivo final:
   - A seção inteira "Log de Auditoria" deve ocupar somente uma página.
   - No caso atual, os eventos das páginas 3, 4 e 5 devem ser condensados em uma única página.
```

## Preview visual sugerido

```html
<!-- audit-log-preview.html -->
<section class="audit-page">
  <header class="audit-header">
    <div>
      <small>ID do Envelope</small>
      <strong>envelope_ntmshorwhzitfibt</strong>
    </div>

    <h1>Log de Auditoria</h1>
  </header>

  <section class="audit-summary">
    <div>
      <span>Status</span>
      <strong>CONCLUÍDO</strong>
    </div>

    <div>
      <span>Fuso Horário</span>
      <strong>America/Recife</strong>
    </div>

    <div>
      <span>Criado em</span>
      <strong>09/06/2026 às 12:24:34</strong>
      <small>UTC: 2026-06-09 15:24:34</small>
    </div>

    <div>
      <span>Última Atualização</span>
      <strong>09/06/2026 às 12:24:35</strong>
      <small>UTC: 2026-06-09 15:24:35</small>
    </div>

    <div class="wide">
      <span>Documentos</span>
      <strong>TERMO DE ADESÃO E PROCURAÇÃO - 513051149 - ERICO CESAR DA SILVA</strong>
    </div>

    <div class="wide">
      <span>Destinatários</span>
      <strong>[Signatário] ERICO CESAR DA SILVA (ecscesar@gmail.com)</strong>
    </div>
  </section>

  <section class="audit-events">
    <article class="audit-card">
      <h2>DOCUMENT COMPLETED</h2>
      <p>Documento concluído</p>
      <time>09/06/2026 às 12:25:18</time>
      <small>UTC: 2026-06-09 15:25:18</small>
      <dl>
        <div><dt>Usuário</dt><dd>N/A</dd></div>
        <div><dt>IP</dt><dd>179.211.185.18</dd></div>
        <div><dt>Agente</dt><dd>Chrome 148.0.0.0 em Mac OS</dd></div>
      </dl>
    </article>

    <article class="audit-card">
      <h2>DOCUMENT RECIPIENT COMPLETED</h2>
      <p>ERICO CESAR DA SILVA assinou o documento</p>
      <time>09/06/2026 às 12:25:17</time>
      <small>UTC: 2026-06-09 15:25:17</small>
      <dl>
        <div><dt>Usuário</dt><dd>ecscesar@gmail.com</dd></div>
        <div><dt>IP</dt><dd>179.211.185.18</dd></div>
        <div><dt>Agente</dt><dd>Chrome 148.0.0.0 em Mac OS</dd></div>
      </dl>
    </article>

    <article class="audit-card">
      <h2>DOCUMENT VIEWED</h2>
      <p>ERICO CESAR DA SILVA visualizou o documento</p>
      <time>09/06/2026 às 12:25:11</time>
      <small>UTC: 2026-06-09 15:25:11</small>
      <dl>
        <div><dt>Usuário</dt><dd>ecscesar@gmail.com</dd></div>
        <div><dt>IP</dt><dd>179.211.185.18</dd></div>
        <div><dt>Agente</dt><dd>Chrome 148.0.0.0 em Mac OS</dd></div>
      </dl>
    </article>

    <article class="audit-card">
      <h2>DOCUMENT FIELD INSERTED</h2>
      <p>ERICO CESAR DA SILVA assinou um campo</p>
      <time>09/06/2026 às 12:25:10</time>
      <small>UTC: 2026-06-09 15:25:10</small>
      <dl>
        <div><dt>Usuário</dt><dd>ecscesar@gmail.com</dd></div>
        <div><dt>IP</dt><dd>179.211.185.18</dd></div>
        <div><dt>Agente</dt><dd>Chrome 148.0.0.0 em Mac OS</dd></div>
      </dl>
    </article>

    <article class="audit-card">
      <h2>DOCUMENT OPENED</h2>
      <p>ERICO CESAR DA SILVA abriu o documento</p>
      <time>09/06/2026 às 12:24:55</time>
      <small>UTC: 2026-06-09 15:24:55</small>
      <dl>
        <div><dt>Usuário</dt><dd>ecscesar@gmail.com</dd></div>
        <div><dt>IP</dt><dd>179.211.185.18</dd></div>
        <div><dt>Agente</dt><dd>Chrome 148.0.0.0 em Mac OS</dd></div>
      </dl>
    </article>

    <article class="audit-card">
      <h2>DOCUMENT SENT</h2>
      <p>Personal Team enviou o documento</p>
      <time>09/06/2026 às 12:24:35</time>
      <small>UTC: 2026-06-09 15:24:35</small>
      <dl>
        <div><dt>Usuário</dt><dd>N/A</dd></div>
        <div><dt>IP</dt><dd>179.211.185.18</dd></div>
        <div><dt>Agente</dt><dd>node</dd></div>
      </dl>
    </article>
  </section>
</section>

<style>
  @page {
    size: A4;
    margin: 10mm;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: Arial, Helvetica, sans-serif;
    color: #111827;
  }

  .audit-page {
    width: 190mm;
    min-height: 277mm;
    padding: 0;
  }

  .audit-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 6px;
    border-bottom: 1px solid #d1d5db;
  }

  .audit-header h1 {
    margin: 0;
    font-size: 14px;
    line-height: 1.1;
  }

  .audit-header small {
    display: block;
    font-size: 6.5px;
    color: #6b7280;
  }

  .audit-header strong {
    display: block;
    font-size: 8px;
  }

  .audit-summary {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 8px;
    margin: 6px 0;
    padding: 6px;
    border: 1px solid #e5e7eb;
    border-radius: 5px;
    background: #f9fafb;
  }

  .audit-summary div {
    min-width: 0;
  }

  .audit-summary .wide {
    grid-column: span 2;
  }

  .audit-summary span {
    display: block;
    font-size: 6.5px;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
  }

  .audit-summary strong {
    display: block;
    font-size: 7.2px;
    line-height: 1.2;
    word-break: break-word;
  }

  .audit-summary small {
    display: block;
    font-size: 6.2px;
    line-height: 1.15;
    color: #4b5563;
  }

  .audit-events {
    column-count: 2;
    column-gap: 6px;
  }

  .audit-card {
    display: inline-block;
    width: 100%;
    margin: 0 0 5px;
    padding: 5px;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    background: #ffffff;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .audit-card h2 {
    margin: 0 0 2px;
    font-size: 7.8px;
    line-height: 1.1;
    letter-spacing: 0.02em;
  }

  .audit-card p {
    margin: 0 0 3px;
    font-size: 7px;
    line-height: 1.15;
  }

  .audit-card time {
    display: block;
    font-size: 6.8px;
    font-weight: 700;
    line-height: 1.15;
  }

  .audit-card small {
    display: block;
    margin-bottom: 3px;
    font-size: 6.2px;
    line-height: 1.15;
    color: #6b7280;
  }

  .audit-card dl {
    margin: 0;
  }

  .audit-card dl div {
    display: grid;
    grid-template-columns: 34px 1fr;
    gap: 3px;
    margin-top: 1px;
  }

  .audit-card dt {
    font-size: 6.2px;
    font-weight: 700;
    color: #6b7280;
  }

  .audit-card dd {
    margin: 0;
    font-size: 6.2px;
    line-height: 1.15;
    word-break: break-word;
  }
</style>
```

## Layout esperado

```text
┌──────────────────────────────────────────────────────────────┐
│ ID do Envelope: envelope_ntmshorwhzitfibt      Log Auditoria │
├──────────────────────────────────────────────────────────────┤
│ Status: CONCLUÍDO             Fuso: America/Recife           │
│ Criado: 09/06/2026 12:24:34   Atualizado: 09/06/2026 12:24:35│
│ Documento: TERMO DE ADESÃO...                                │
│ Destinatário: ERICO CESAR DA SILVA                           │
├──────────────────────────────┬───────────────────────────────┤
│ DOCUMENT COMPLETED           │ DOCUMENT FIELD INSERTED        │
│ Documento concluído          │ Assinou um campo               │
│ 09/06/2026 12:25:18          │ 09/06/2026 12:25:10            │
│ Usuário: N/A                 │ Usuário: ecscesar@gmail.com    │
│ IP: 179.211.185.18           │ IP: 179.211.185.18             │
├──────────────────────────────┼───────────────────────────────┤
│ DOCUMENT RECIPIENT COMPLETED │ DOCUMENT OPENED                │
│ Assinou o documento          │ Abriu o documento              │
│ 09/06/2026 12:25:17          │ 09/06/2026 12:24:55            │
├──────────────────────────────┼───────────────────────────────┤
│ DOCUMENT VIEWED              │ DOCUMENT SENT                  │
│ Visualizou o documento       │ Personal Team enviou           │
│ 09/06/2026 12:25:11          │ 09/06/2026 12:24:35            │
└──────────────────────────────┴───────────────────────────────┘
