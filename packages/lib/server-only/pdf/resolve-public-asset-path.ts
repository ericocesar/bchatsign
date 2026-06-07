import fs from 'node:fs';
import path from 'node:path';

export const resolvePublicAssetPath = (assetPath: string) => {
  const normalizedAssetPath = assetPath.replace(/^[/\\]+/, '');

  const candidates = [
    path.join(process.cwd(), 'public', normalizedAssetPath),
    path.join(process.cwd(), 'apps/remix/public', normalizedAssetPath),
    path.join(process.cwd(), '../../apps/remix/public', normalizedAssetPath),
  ];

  const resolvedPath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!resolvedPath) {
    throw new Error(`Public asset not found: ${assetPath}`);
  }

  return resolvedPath;
};
