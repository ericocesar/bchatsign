# Debug Session: signing-processing-failure

- Status: OPEN
- Started At: 2026-06-05
- Symptom: ao assinar o documento, o frontend mostra `Document processing failed`
- Secondary Symptoms:
  - `Minified React error #418`
  - `Minified React error #423`
  - `Couldn't find a style target`
  - avisos de CSP em `dnd.esm-*`

## Hypotheses

1. A tela de conclusao esta entrando em `FAILED` por falso negativo no polling de `envelope.signingStatus`, sem relacao com a conclusao real do sealing.
2. Ainda existe um hydration mismatch em algum trecho da rota de assinatura/conclusao, e os erros React `#418/#423` quebram a reconciliacao da tela.
3. O erro `Couldn't find a style target` vem de extensao do navegador (`contentScript.bundle.js`) e e ruido, nao causa raiz do fluxo de assinatura.
4. A CSP em producao esta bloqueando estilos inline de uma dependencia usada no viewer/editor e isso altera a arvore renderizada no cliente.
5. O job `internal.seal-document` nao esta concluindo no ambiente remoto, e o frontend agora apenas expoe corretamente uma falha real de processamento.

## Evidence Log

- Debug Server ativo em `http://127.0.0.1:7777`
- Arquivo de logs: `.dbg/trae-debug-log-signing-processing-failure.ndjson`
- Instrumentacao adicionada em `packages/trpc/server/envelope-router/signing-status-envelope.ts`
  - ponto `A:signing-status-complete`
  - ponto `E:signing-status-failed`
  - ponto `E:signing-status-processing`
- Reproducao em navegador limpo da automacao em `http://localhost:3000/signin`
  - sem `Hydration failed`
  - sem `Did not expect server HTML to contain a <div> in <html>`
  - apenas info normal do React DevTools

## Next Step

- Pedir reproducao em janela anonima sem extensoes.
- Se o problema persistir, reproduzir assinatura com a build instrumentada.
- Ler `.dbg/trae-debug-log-signing-processing-failure.ndjson`.
- Confirmar se o `FAILED` vem de:
  - `latestSealJob.status = FAILED`
  - `isSealJobStuck = true`
  - `isSealJobMissing = true`
