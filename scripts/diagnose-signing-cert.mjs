#!/usr/bin/env node
// file: scripts/diagnose-signing-cert.mjs
//
// Diagnoses why a .p12/.pfx signing certificate fails to load or sign, using
// the same library and code path as packages/signing/transports/local.ts.
// The passphrase is never printed — only its shape (length, risky chars).
//
// Locally (prompts for the passphrase, hidden):
//   node scripts/diagnose-signing-cert.mjs /path/to/cert.pfx
//
// Inside the production container (uses the container's own env vars and mounted file):
//   docker exec -i <container> node --input-type=module - < scripts/diagnose-signing-cert.mjs
//
// Re-export recipe (unsupported format, or the company certificate is not the first one).
// Drop -legacy if your openssl rejects the flag; delete key.pem right after — it is the unencrypted key.
//   openssl pkcs12 -legacy -in original.pfx -nocerts -nodes -out key.pem
//   openssl pkcs12 -legacy -in original.pfx -clcerts -nokeys -out leaf.pem
//   openssl pkcs12 -legacy -in original.pfx -cacerts -nokeys -out chain.pem
//   openssl pkcs12 -export -inkey key.pem -in leaf.pem -certfile chain.pem -out novo.p12 \
//     -keypbe AES-256-CBC -certpbe AES-256-CBC -macalg sha256
//   rm -P key.pem

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';

const { P12Signer, PDF } = await import('@libpdf/core');

const ok = (msg) => console.log(`  OK    ${msg}`);
const warn = (msg) => console.log(`  AVISO ${msg}`);
const bad = (msg) => console.log(`  ERRO  ${msg}`);
const step = (msg) => console.log(`\n== ${msg}`);

const readHiddenLine = async (prompt) => {
  if (!process.stdin.isTTY) {
    return '';
  }

  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  return await new Promise((resolve) => {
    let value = '';

    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.off('data', onData);
          process.stdout.write('\n');
          resolve(value);
          return;
        }

        if (char === '\u0003') {
          process.exit(130);
        }

        if (char === '\u007f') {
          value = value.slice(0, -1);
          continue;
        }

        value += char;
      }
    };

    process.stdin.on('data', onData);
  });
};

const describePassphrase = (passphrase) => {
  step('Senha (conteudo nao e exibido)');

  if (!passphrase) {
    warn('senha vazia — se o .pfx tem senha, NEXT_PRIVATE_SIGNING_PASSPHRASE nao chegou ao processo');
    return;
  }

  ok(`${passphrase.length} caracteres`);

  if (passphrase !== passphrase.trim()) {
    bad('tem espaco no inicio ou no fim (YAML/compose remove ou preserva de forma inesperada)');
  }

  if (passphrase.includes('$')) {
    bad(
      "contem '$' — docker compose/Portainer interpreta '$' como variavel. No stack YAML escreva '$$' no lugar de cada '$'",
    );
  }

  if (/\s#/.test(passphrase)) {
    bad("contem ' #' — em YAML sem aspas isso inicia um comentario e corta a senha");
  }

  if (/^["']/.test(passphrase) || /["']$/.test(passphrase)) {
    warn('comeca ou termina com aspas — confira se as aspas fazem parte da senha ou vieram do YAML');
  }

  if (/[^\x20-\x7e]/.test(passphrase)) {
    warn(
      'contem caracteres fora do ASCII (acento, cedilha, emoji) — podem ser codificados diferente do programa que gerou o .pfx',
    );
  }
};

const loadBytes = (filePath) => {
  step('Arquivo do certificado');

  const contents = process.env.NEXT_PRIVATE_SIGNING_LOCAL_FILE_CONTENTS;

  if (!filePath && contents) {
    ok('usando NEXT_PRIVATE_SIGNING_LOCAL_FILE_CONTENTS (base64)');
    return Buffer.from(contents, 'base64');
  }

  let stats;

  try {
    stats = fs.statSync(filePath);
  } catch {
    bad(`nao encontrado: ${filePath}`);
    console.log('        Confira o caminho do volume no stack: o arquivo precisa existir no host nesse caminho exato.');
    return null;
  }

  if (!stats.isFile()) {
    bad(`${filePath} nao e um arquivo (e um diretorio?)`);
    console.log('        Se o arquivo nao existe no host, o Docker cria um DIRETORIO vazio no lugar do bind mount.');
    return null;
  }

  if (stats.size === 0) {
    bad(`${filePath} esta vazio`);
    return null;
  }

  const bytes = fs.readFileSync(filePath);
  const fingerprint = crypto.createHash('sha256').update(bytes).digest('hex');

  ok(`${filePath} (${stats.size} bytes)`);
  ok(`sha256 do arquivo: ${fingerprint}`);
  console.log('        Compare esse sha256 com o do .pfx no seu computador para ter certeza de que e o mesmo arquivo.');

  return bytes;
};

const loadSigner = async (bytes, passphrase) => {
  step('Abrindo o .pfx (mesma chamada do app, sem buscar cadeia)');

  try {
    const signer = await P12Signer.create(bytes, passphrase, { buildChain: false });
    ok('.pfx aberto com sucesso');
    return signer;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    bad(message);

    // A wrong passphrase surfaces as "Integrity for the PKCS#12 data is broken!" — libpdf only maps
    // lowercase "integrity" to "Invalid password", so it reads like a format problem but isn't.
    if (message.includes('Invalid password') || /integrity|mac verify/i.test(message)) {
      console.log(
        '        SENHA ERRADA: a senha que chegou ao processo nao abre este arquivo. Veja os avisos de senha acima.',
      );
    } else if (message.includes('Failed to parse PKCS#12') || message.includes('ASN.1')) {
      console.log(
        '        Formato do .pfx nao suportado. Reexporte-o com openssl (receita no cabecalho deste script).',
      );
    } else if (message.includes('Unsupported key algorithm')) {
      console.log('        Tipo de chave nao suportado (so RSA e ECDSA P-256/384/521).');
    }

    return null;
  }
};

const inspectCertificates = async (signer) => {
  step('Certificados dentro do .pfx');

  const keyDer = Buffer.from(await crypto.webcrypto.subtle.exportKey('pkcs8', signer.privateKey));
  const keyObject = crypto.createPrivateKey({ key: keyDer, format: 'der', type: 'pkcs8' });

  const all = [signer.certificate, ...(signer.certificateChain ?? [])];
  const now = new Date();
  let matchingIndex = -1;

  all.forEach((der, index) => {
    const cert = new crypto.X509Certificate(Buffer.from(der));
    const matchesKey = cert.checkPrivateKey(keyObject);

    if (matchesKey && matchingIndex === -1) {
      matchingIndex = index;
    }

    console.log(`  [${index}]${index === 0 ? ' <- usado para assinar' : ''}`);
    console.log(`        subject: ${cert.subject.replace(/\n/g, ', ')}`);
    console.log(`        issuer:  ${cert.issuer.replace(/\n/g, ', ')}`);
    console.log(`        validade: ${cert.validFrom} -> ${cert.validTo}`);
    console.log(`        CA: ${cert.ca ? 'sim' : 'nao'} | combina com a chave privada: ${matchesKey ? 'SIM' : 'nao'}`);

    if (index === 0) {
      if (new Date(cert.validTo) < now) {
        bad('o certificado de assinatura esta VENCIDO');
      }

      if (new Date(cert.validFrom) > now) {
        bad('o certificado de assinatura ainda NAO comecou a valer (ou o relogio do servidor esta errado)');
      }
    }
  });

  if (matchingIndex === 0) {
    ok('o primeiro certificado e o que corresponde a chave privada');
  } else if (matchingIndex > 0) {
    bad(`a chave privada corresponde ao certificado [${matchingIndex}], mas o app assina com o [0]`);
    console.log(
      '        O .pfx tem a cadeia em outra ordem. Reexporte-o com o certificado da empresa primeiro (receita no cabecalho deste script).',
    );
  } else {
    bad('nenhum certificado do .pfx corresponde a chave privada');
  }

  return matchingIndex === 0;
};

const testChain = async (bytes, passphrase) => {
  step('Montando a cadeia ICP-Brasil via AIA (como o app faz)');

  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args.map(String).join(' '));

  const startedAt = Date.now();

  try {
    const signer = await P12Signer.create(bytes, passphrase, { buildChain: true });
    ok(`${signer.certificateChain.length} certificado(s) na cadeia em ${Date.now() - startedAt} ms`);
  } catch (error) {
    bad(error instanceof Error ? error.message : String(error));
  } finally {
    console.warn = originalWarn;
  }

  for (const message of warnings) {
    warn(message);
  }
};

const testSign = async (signer) => {
  step('Assinando um PDF de teste');

  try {
    const pdf = PDF.create();
    pdf.addPage();

    const { bytes, warnings } = await pdf.sign({
      signer,
      reason: 'Diagnostico de certificado',
      subFilter: 'ETSI.CAdES.detached',
    });

    ok(`PDF assinado (${bytes.length} bytes)`);

    for (const warning of warnings ?? []) {
      warn(`${warning.code}: ${warning.message}`);
    }
  } catch (error) {
    bad(error instanceof Error ? (error.stack ?? error.message) : String(error));
  }
};

const main = async () => {
  const filePath =
    process.argv[2] ||
    process.env.NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH ||
    (process.env.NEXT_PRIVATE_SIGNING_LOCAL_FILE_CONTENTS ? '' : '/opt/bchatsign/cert.p12');

  const passphrase = process.env.NEXT_PRIVATE_SIGNING_PASSPHRASE ?? (await readHiddenLine('Senha do certificado: '));

  console.log(`Node ${process.version} | OpenSSL ${process.versions.openssl}`);

  describePassphrase(passphrase);

  const bytes = loadBytes(filePath);

  if (!bytes) {
    process.exitCode = 1;
    return;
  }

  const signer = await loadSigner(bytes, passphrase);

  if (!signer) {
    process.exitCode = 1;
    return;
  }

  const isOrderOk = await inspectCertificates(signer);

  await testChain(bytes, passphrase);
  await testSign(signer);

  step('Resultado');

  if (isOrderOk) {
    ok('o certificado carrega e assina; se o app ainda falha, mande o erro do job internal.seal-document');
  } else {
    bad('corrija a ordem/correspondencia dos certificados no .pfx antes de usar em producao');
    process.exitCode = 1;
  }
};

await main();
