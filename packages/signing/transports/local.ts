import * as fs from 'node:fs';
import { env } from '@bchatsign/lib/utils/env';
import { P12Signer } from '@libpdf/core';

const getDefaultLocalFilePath = () =>
  env('NODE_ENV') === 'production' ? '/opt/bchatsign/cert.p12' : './example/cert.p12';

const readP12File = (filePath: string): Uint8Array => {
  let stats: fs.Stats;

  try {
    stats = fs.statSync(filePath);
  } catch (error) {
    throw new Error(
      `Local signing certificate file was not found or is not readable at "${filePath}". Set NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH to a readable .p12 file or NEXT_PRIVATE_SIGNING_LOCAL_FILE_CONTENTS to the base64-encoded certificate contents.`,
      { cause: error },
    );
  }

  if (!stats.isFile()) {
    throw new Error(
      `NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH must point to a .p12 file, but "${filePath}" is not a regular file.`,
    );
  }

  if (stats.size === 0) {
    throw new Error(`Local signing certificate file is empty at "${filePath}".`);
  }

  return fs.readFileSync(filePath);
};

const loadP12 = (): Uint8Array => {
  const localFileContents = env('NEXT_PRIVATE_SIGNING_LOCAL_FILE_CONTENTS');

  if (localFileContents) {
    return Buffer.from(localFileContents, 'base64');
  }

  return readP12File(env('NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH') || getDefaultLocalFilePath());
};

export const createLocalSigner = async () => {
  const p12 = loadP12();

  return await P12Signer.create(p12, env('NEXT_PRIVATE_SIGNING_PASSPHRASE') || '', {
    buildChain: true,
  });
};
