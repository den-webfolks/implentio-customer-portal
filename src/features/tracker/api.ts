/** Tracker feature hooks — the only path from tracker components to data. */
import { useQuery } from '@tanstack/react-query'
import { useDataSource } from '@/data/DataSourceProvider'
import {
  useDownloadState,
  useMemos,
  useOutcomeRows,
  useRecordMemoDownload,
} from '@/data/queries'
import { useClock } from '@/lib/clock'
import { trackerDisputeCta, type TrackerCta } from './derive'

export { useMemos, useDownloadState, useOutcomeRows, useRecordMemoDownload }

export function useDisputeContext() {
  const ds = useDataSource()
  return useQuery({ queryKey: ['disputeContext'], queryFn: () => ds.getDisputeContext() })
}

/** The golden memo's tracker CTA (dispute state machine). */
export function useGoldenCta(goldenMemoId: string | undefined): TrackerCta | null {
  const ds = useDataSource()
  const clock = useClock()
  const ctx = useDisputeContext()
  const detail = useQuery({
    queryKey: ['memo', goldenMemoId ?? 'none'],
    queryFn: () => (goldenMemoId ? ds.getMemoDetail(goldenMemoId) : Promise.resolve(null)),
    enabled: !!goldenMemoId,
  })
  if (!detail.data || !ctx.data) return null
  return trackerDisputeCta({
    findingGroups: detail.data.findingGroups,
    findingsUnavailable: detail.data.findingsUnavailable,
    memoDisputeStatus: ctx.data.memoDisputeStatus,
    excludedIds: ctx.data.excludedIds,
    draftDate: ctx.data.draftDate,
    now: clock.now(),
  })
}
