import { NEXT_PUBLIC_WEBAPP_URL } from '@bchatsign/lib/constants/app';
import { getRecipientOrSenderByShareLinkSlug } from '@bchatsign/lib/server-only/document/get-recipient-or-sender-by-share-link-slug';
import { svgToPng } from '@bchatsign/lib/utils/images/svg-to-png';
import satori from 'satori';
import { match, P } from 'ts-pattern';

import type { Route } from './+types/share.$slug.opengraph';

export const runtime = 'edge';

const CARD_OFFSET_TOP = 185;
const CARD_OFFSET_LEFT = 307;
const CARD_WIDTH = 590;
const CARD_HEIGHT = 325;

const IMAGE_SIZE = {
  width: 1200,
  height: 630,
};

const ACCENT_COLOR = '#15A34A';

export const loader = async ({ params }: Route.LoaderArgs) => {
  const { slug } = params;

  // QR codes are not supported for OpenGraph images
  if (slug.startsWith('qr_')) {
    return new Response('Not found', { status: 404 });
  }

  const baseUrl = NEXT_PUBLIC_WEBAPP_URL();

  const [interSemiBold, interRegular, caveatRegular] = await Promise.all([
    fetch(new URL(`${baseUrl}/fonts/inter-semibold.ttf`, import.meta.url)).then(async (res) => res.arrayBuffer()),
    fetch(new URL(`${baseUrl}/fonts/inter-regular.ttf`, import.meta.url)).then(async (res) => res.arrayBuffer()),
    fetch(new URL(`${baseUrl}/fonts/caveat-regular.ttf`, import.meta.url)).then(async (res) => res.arrayBuffer()),
  ]);

  const recipientOrSender = await getRecipientOrSenderByShareLinkSlug({
    slug,
  });

  if ('error' in recipientOrSender) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const isRecipient = 'Signature' in recipientOrSender;

  const signatureImage = match(recipientOrSender)
    .with({ signatures: P.array(P._) }, (recipient) => {
      return recipient.signatures?.[0]?.signatureImageAsBase64 || null;
    })
    .otherwise((sender) => {
      return sender.signature || null;
    });

  const signatureName = match(recipientOrSender)
    .with({ signatures: P.array(P._) }, (recipient) => {
      return recipient.name || recipient.email;
    })
    .otherwise((sender) => {
      return sender.name || sender.email;
    });

  // Generate SVG using Satori
  const svg = await satori(
    <div
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        backgroundColor: 'white',
        position: 'relative',
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '8px',
          backgroundColor: ACCENT_COLOR,
        }}
      />

      {/* Left accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '14px',
          height: '100%',
          backgroundColor: ACCENT_COLOR,
        }}
      />

      {/* Logo */}
      <img
        src={`${baseUrl}/static/logo.png`}
        alt="Bchatsign"
        style={{
          position: 'absolute',
          top: 32,
          left: 40,
          width: 180,
          height: 'auto',
        }}
      />

      {/* Signature card border */}
      <div
        style={{
          position: 'absolute',
          top: CARD_OFFSET_TOP - 8,
          left: CARD_OFFSET_LEFT - 12,
          width: CARD_WIDTH + 24,
          height: CARD_HEIGHT + 28,
          borderWidth: '1px',
          borderColor: '#e5e7eb',
          borderStyle: 'solid',
          borderRadius: '12px',
        }}
      />

      {signatureImage ? (
        <div
          style={{
            position: 'absolute',
            padding: '24px 48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            top: CARD_OFFSET_TOP,
            left: CARD_OFFSET_LEFT,
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
          }}
        >
          <img
            src={signatureImage}
            alt="signature"
            style={{
              opacity: 0.6,
              height: '100%',
              maxWidth: '100%',
            }}
          />
        </div>
      ) : (
        <p
          style={{
            position: 'absolute',
            padding: '24px 48px',
            marginTop: '-8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: '#64748b',
            fontFamily: 'Caveat',
            fontSize: Math.max(Math.min((CARD_WIDTH * 1.5) / signatureName.length, 80), 36),
            top: CARD_OFFSET_TOP,
            left: CARD_OFFSET_LEFT,
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
          }}
        >
          {signatureName}
        </p>
      )}

      {/* Status header */}
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          width: '100%',
          top: CARD_OFFSET_TOP - 80,
          left: CARD_OFFSET_LEFT,
        }}
      >
        <h2
          style={{
            fontSize: '20px',
            color: '#374151',
            fontFamily: 'Inter',
            fontWeight: 700,
          }}
        >
          {isRecipient ? 'Documento Assinado!' : 'Documento Enviado!'}
        </h2>
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          right: 40,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <p
          style={{
            fontSize: '13px',
            color: '#9ca3af',
            fontFamily: 'Inter',
            fontWeight: 400,
          }}
        >
          Assinado com
        </p>
        <p
          style={{
            fontSize: '13px',
            color: ACCENT_COLOR,
            fontFamily: 'Inter',
            fontWeight: 600,
          }}
        >
          bchatsign
        </p>
      </div>
    </div>,
    {
      width: IMAGE_SIZE.width,
      height: IMAGE_SIZE.height,
      fonts: [
        {
          name: 'Caveat',
          data: caveatRegular,
          style: 'italic',
        },
        {
          name: 'Inter',
          data: interRegular,
          weight: 400,
        },
        {
          name: 'Inter',
          data: interSemiBold,
          weight: 600,
        },
      ],
    },
  );

  const pngBuffer = await svgToPng(svg.toString());

  return new Response(pngBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': pngBuffer.length.toString(),
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
};
