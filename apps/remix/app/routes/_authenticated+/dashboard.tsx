import { useSession } from '@bchatsign/lib/client-only/providers/session';
import { SKIP_QUERY_BATCH_META } from '@bchatsign/lib/constants/trpc';
import { ExtendedDocumentStatus } from '@bchatsign/prisma/types/extended-document-status';
import { trpc } from '@bchatsign/trpc/react';
import type { TFindDocumentsInternalResponse } from '@bchatsign/trpc/server/document-router/find-documents-internal.types';
import { Button } from '@bchatsign/ui/primitives/button';
import { Skeleton } from '@bchatsign/ui/primitives/skeleton';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { DocumentStatus } from '@bchatsign/prisma/generated/types';
import { motion } from 'framer-motion';
import { Building2Icon, Clock3Icon, FileTextIcon, LayoutTemplateIcon, MoreVertical, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router';

import { OrganisationInvitations } from '~/components/general/organisations/organisation-invitations';
import { useOptionalCurrentTeam } from '~/providers/team';
import { appMetaTags } from '~/utils/meta';

export function meta() {
  return appMetaTags(msg`Dashboard`);
}

const glassCardClass =
  'relative overflow-hidden rounded-[26px] border border-white/40 bg-white/30 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-[22px] backdrop-saturate-150';

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

export default function DashboardPage() {
  const { t: _ } = useLingui();

  const { user, organisations } = useSession();
  const currentTeam = useOptionalCurrentTeam();
  const params = useParams();

  const teamId = useMemo(() => {
    if (currentTeam?.id) {
      return currentTeam.id;
    }

    if (params.teamUrl) {
      const team = organisations.flatMap((org) => org.teams).find((team) => team.url === params.teamUrl);

      if (team) {
        return team.id;
      }
    }

    return organisations[0]?.teams[0]?.id ?? null;
  }, [currentTeam, params.teamUrl, organisations]);

  const documentsHref = currentTeam?.url
    ? `/t/${currentTeam.url}/documents`
    : organisations[0]?.teams[0]?.url
      ? `/t/${organisations[0].teams[0].url}/documents`
      : '/dashboard';

  const templatesHref = currentTeam?.url
    ? `/t/${currentTeam.url}/templates`
    : organisations[0]?.teams[0]?.url
      ? `/t/${organisations[0].teams[0].url}/templates`
      : '/dashboard';

  const { data: stats, isLoading } = trpc.dashboard.getStats.useQuery(
    { teamId: teamId ?? 0 },
    {
      enabled: teamId !== null,
      retry: false,
    },
  );

  const { data: recentDocumentsData } = trpc.document.findDocumentsInternal.useQuery(
    { perPage: 5, status: ExtendedDocumentStatus.ALL, page: 1, teamId },
    {
      enabled: teamId !== null && teamId > 0,
      ...SKIP_QUERY_BATCH_META,
    },
  );

  const greeting = (() => {
    if (!user?.name) {
      return _(msg`Welcome back`);
    }
    const first = user.name.split(' ')[0];
    return first ? `${_(msg`Welcome back`)}, ${first}` : _(msg`Welcome back`);
  })();

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col py-4 md:py-5">
        <OrganisationInvitations className="mb-3" />

        {organisations.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 border-dashed bg-card/40 px-6 py-20 text-center">
            <div className="icon-tile icon-tile-brand mb-3 h-12 w-12">
              <Building2Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <p className="font-semibold text-base">
                <Trans>No organisations found</Trans>
              </p>
              <p className="max-w-sm text-muted-foreground text-sm">
                <Trans>Create an organisation to start signing and managing documents.</Trans>
              </p>
            </div>
            <Button asChild className="mt-4 h-9 rounded-lg">
              <Link to="/settings/organisations?action=add-organisation">
                <Trans>Create organisation</Trans>
              </Link>
            </Button>
          </div>
        )}

        {teamId !== null && (
          <div className="relative overflow-hidden rounded-[34px] border border-white/45 bg-white/22 p-4 shadow-[0_28px_80px_rgba(15,23,42,0.14)] backdrop-blur-[28px] backdrop-saturate-150 md:p-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),rgba(248,250,252,0.72)_35%,rgba(226,232,240,0.56)_62%,rgba(148,163,184,0.18)_100%)] opacity-60" />
            <div className="relative z-10">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-sm">{greeting}.</p>
                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    variant="outline"
                    className="h-8 rounded-lg border-border/70 bg-card/60 font-medium text-[12px]"
                  >
                    <Link to={templatesHref}>
                      <LayoutTemplateIcon className="mr-1.5 h-3 w-3" strokeWidth={1.75} />
                      <Trans>Templates</Trans>
                    </Link>
                  </Button>
                  <Button asChild className="h-8 rounded-lg font-medium text-[12px] shadow-soft-sm">
                    <Link to={documentsHref}>
                      <FileTextIcon className="mr-1.5 h-3 w-3" strokeWidth={1.75} />
                      <Trans>Open documents</Trans>
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                <GlassStatCard
                  title={_(msg`Rascunhos`)}
                  value={isLoading || !stats ? '—' : stats.documents.draft.toLocaleString('pt-BR')}
                  accentClass="border-l-slate-400"
                  iconWrapClass="bg-slate-200/80 text-slate-600"
                  icon={FileTextIcon}
                  isLoading={isLoading}
                />
                <GlassStatCard
                  title={_(msg`Pendentes`)}
                  value={isLoading || !stats ? '—' : stats.documents.pending.toLocaleString('pt-BR')}
                  accentClass="border-l-amber-500"
                  iconWrapClass="bg-amber-100/80 text-amber-500"
                  icon={Clock3Icon}
                  isLoading={isLoading}
                />
                <GlassStatCard
                  title={_(msg`Concluídos`)}
                  value={isLoading || !stats ? '—' : stats.documents.completed.toLocaleString('pt-BR')}
                  accentClass="border-l-green-600"
                  iconWrapClass="bg-green-100/80 text-green-600"
                  icon={ShieldCheck}
                  isLoading={isLoading}
                />
              </div>

              <div className="mt-3">
                <GlassCard className="p-4">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 className="font-semibold text-slate-900 text-xl tracking-[-0.03em]">
                      <Trans>Documentos Recentes</Trans>
                    </h2>
                    <Link
                      to={documentsHref}
                      className="font-semibold text-blue-600 text-sm transition hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                    >
                      <Trans>Ver todos</Trans>
                    </Link>
                  </div>
                  <RecentDocumentsTable documents={recentDocumentsData?.data ?? []} documentsHref={documentsHref} />
                </GlassCard>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GlassCard({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.section {...fadeUp} className={`${glassCardClass} ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.58),transparent_42%)] opacity-60" />
      <div className="relative z-10 h-full">{children}</div>
    </motion.section>
  );
}

function GlassStatCard({
  title,
  value,
  accentClass,
  iconWrapClass,
  icon: Icon,
  isLoading,
}: {
  title: string;
  value: string;
  accentClass: string;
  iconWrapClass: string;
  icon: typeof FileTextIcon;
  isLoading: boolean;
}) {
  return (
    <GlassCard className={`border-l-[3px] p-3 ${accentClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${iconWrapClass}`}>
            <Icon className="h-4 w-4" strokeWidth={2} />
          </div>
          <p className="font-medium text-slate-700 text-sm">{title}</p>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="font-semibold text-4xl text-slate-900 leading-none tracking-[-0.03em]">{value}</div>
        )}
      </div>
    </GlassCard>
  );
}

function StatusBadge({
  tone,
  children,
}: {
  tone: 'warning' | 'info' | 'success' | 'danger';
  children: React.ReactNode;
}) {
  const styles = {
    warning: 'bg-amber-100/90 text-amber-600',
    info: 'bg-blue-100/90 text-blue-600',
    success: 'bg-green-100/90 text-green-700',
    danger: 'bg-red-100/90 text-red-600',
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 font-semibold text-xs ${styles[tone]}`}>• {children}</span>
  );
}

const statusToneMap: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  [DocumentStatus.DRAFT]: 'warning',
  [DocumentStatus.PENDING]: 'info',
  [DocumentStatus.COMPLETED]: 'success',
  [DocumentStatus.REJECTED]: 'danger',
};

const statusLabelMap: Record<string, string> = {
  [DocumentStatus.DRAFT]: 'Rascunho',
  [DocumentStatus.PENDING]: 'Pendente',
  [DocumentStatus.COMPLETED]: 'Concluído',
  [DocumentStatus.REJECTED]: 'Rejeitado',
};

function formatDocumentDate(date: Date | string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return `Hoje, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  if (days === 1) {
    return `Ontem, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function RecentDocumentsTable({
  documents,
  documentsHref,
}: {
  documents: TFindDocumentsInternalResponse['data'];
  documentsHref: string;
}) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/25">
      <div className="grid grid-cols-[minmax(0,1.9fr)_110px_95px_48px] gap-3 border-slate-200/70 border-b px-5 py-3 font-semibold text-[11px] text-slate-500 uppercase tracking-[0.12em]">
        <div>
          <Trans>Nome do documento</Trans>
        </div>
        <div>
          <Trans>Status</Trans>
        </div>
        <div>
          <Trans>Data</Trans>
        </div>
        <div className="text-center">
          <Trans>Ações</Trans>
        </div>
      </div>
      <div>
        {documents.length === 0 ? (
          <div className="px-5 py-6 text-center text-slate-500 text-sm">
            <Trans>Nenhum documento encontrado</Trans>
          </div>
        ) : (
          documents.map((doc, index) => (
            <div
              key={doc.id}
              className={`grid grid-cols-[minmax(0,1.9fr)_110px_95px_48px] items-center gap-3 px-5 py-3 ${
                index !== documents.length - 1 ? 'border-slate-200/60 border-b' : ''
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-100/85 text-blue-600">
                  <FileTextIcon className="h-4 w-4" strokeWidth={2} />
                </div>
                <span className="truncate font-medium text-slate-800 text-sm">{doc.title}</span>
              </div>
              <div>
                <StatusBadge tone={statusToneMap[doc.status] ?? 'info'}>
                  {statusLabelMap[doc.status] ?? doc.status}
                </StatusBadge>
              </div>
              <div className="text-slate-500 text-sm">{formatDocumentDate(doc.createdAt)}</div>
              <div className="flex justify-center">
                <Link
                  to={`${documentsHref}/${doc.id}`}
                  aria-label={`Abrir ${doc.title}`}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/45 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                >
                  <MoreVertical className="h-4 w-4" strokeWidth={2} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
