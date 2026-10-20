/* eslint-disable @typescript-eslint/no-var-requires */
const baseConfig = require('@bchatsign/ui/tailwind.config.cjs');
const path = require('path');

module.exports = {
  presets: [baseConfig],
  content: [
    './app/**/*.{ts,tsx}',
    `${path.join(require.resolve('@bchatsign/ui'), '..')}/components/**/*.{ts,tsx}`,
    `${path.join(require.resolve('@bchatsign/ui'), '..')}/icons/**/*.{ts,tsx}`,
    `${path.join(require.resolve('@bchatsign/ui'), '..')}/lib/**/*.{ts,tsx}`,
    `${path.join(require.resolve('@bchatsign/ui'), '..')}/primitives/**/*.{ts,tsx}`,
    `${path.join(require.resolve('@bchatsign/email'), '..')}/templates/**/*.{ts,tsx}`,
    `${path.join(require.resolve('@bchatsign/email'), '..')}/template-components/**/*.{ts,tsx}`,
    `${path.join(require.resolve('@bchatsign/email'), '..')}/providers/**/*.{ts,tsx}`,
  ],
};
