import { env } from '../utils/env';

export const BCHATSIGN_ENCRYPTION_KEY = env('NEXT_PRIVATE_ENCRYPTION_KEY');

export const BCHATSIGN_ENCRYPTION_SECONDARY_KEY = env('NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY');

// if (typeof window === 'undefined') {
//   if (!BCHATSIGN_ENCRYPTION_KEY || !BCHATSIGN_ENCRYPTION_SECONDARY_KEY) {
//     throw new Error('Missing BCHATSIGN_ENCRYPTION_KEY or BCHATSIGN_ENCRYPTION_SECONDARY_KEY keys');
//   }

//   if (BCHATSIGN_ENCRYPTION_KEY === BCHATSIGN_ENCRYPTION_SECONDARY_KEY) {
//     throw new Error(
//       'BCHATSIGN_ENCRYPTION_KEY and BCHATSIGN_ENCRYPTION_SECONDARY_KEY cannot be equal',
//     );
//   }
// }

// if (BCHATSIGN_ENCRYPTION_KEY === 'CAFEBABE') {
//   console.warn('*********************************************************************');
//   console.warn('*');
//   console.warn('*');
//   console.warn('Please change the encryption key from the default value of "CAFEBABE"');
//   console.warn('*');
//   console.warn('*');
//   console.warn('*********************************************************************');
// }
