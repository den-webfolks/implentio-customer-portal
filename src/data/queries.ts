/**
 * Thin TanStack Query hooks over the AppDataSource seam. Feature api.ts
 * modules re-export/compose these; screens never touch the source directly.
 */
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { Collection } from '@/domain/types'
import type { SendDisputeInput } from './source'
import { useDataSource } from './DataSourceProvider'

export const queryKeys = {
  memos: ['memos'] as const,
  memoDetail: (id: string) => ['memo', id] as const,
  downloads: ['downloads'] as const,
  outcomeRows: ['outcomeRows'] as const,
  account: ['account'] as const,
  activity: (memoId: string) => ['activity', memoId] as const,
  disputes: (memoId: string) => ['disputes', memoId] as const,
  disputeContext: (memoId: string) => ['disputeContext', memoId] as const,
}

/** Everything a dispute mutation can change: findings, drafts, dispute
 *  records, the outcome ledger, activity, and the tracker cards. */
function invalidateDisputeData(qc: QueryClient) {
  for (const key of [['memo'], ['disputeContext'], ['disputes'], queryKeys.outcomeRows, ['activity'], queryKeys.memos]) {
    void qc.invalidateQueries({ queryKey: key })
  }
}

export function useMemos() {
  const ds = useDataSource()
  return useQuery({ queryKey: queryKeys.memos, queryFn: () => ds.listMemos() })
}

export function useMemoDetail(memoId: string) {
  const ds = useDataSource()
  return useQuery({
    queryKey: queryKeys.memoDetail(memoId),
    queryFn: () => ds.getMemoDetail(memoId),
  })
}

export function useDownloadState() {
  const ds = useDataSource()
  return useQuery({ queryKey: queryKeys.downloads, queryFn: () => ds.getDownloadState() })
}

export function useOutcomeRows() {
  const ds = useDataSource()
  return useQuery({ queryKey: queryKeys.outcomeRows, queryFn: () => ds.listOutcomeRows() })
}

export function useInvoiceIndex() {
  const ds = useDataSource()
  return useQuery({ queryKey: ['invoiceIndex'], queryFn: () => ds.listInvoiceIndex() })
}

export function useAccount() {
  const ds = useDataSource()
  return useQuery({ queryKey: queryKeys.account, queryFn: () => ds.getAccount() })
}

export function useActivity(memoId: string) {
  const ds = useDataSource()
  return useQuery({ queryKey: queryKeys.activity(memoId), queryFn: () => ds.getActivity(memoId) })
}

export function useDisputes(memoId: string) {
  const ds = useDataSource()
  return useQuery({ queryKey: queryKeys.disputes(memoId), queryFn: () => ds.listDisputes(memoId) })
}

export function useDisputeContext(memoId: string | undefined) {
  const ds = useDataSource()
  return useQuery({
    queryKey: queryKeys.disputeContext(memoId ?? 'none'),
    queryFn: () => ds.getDisputeContext(memoId ?? ''),
    enabled: !!memoId,
  })
}

// ---- mutations ----

export function useRecordMemoDownload() {
  const ds = useDataSource()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (memoId: string) => ds.recordMemoDownload(memoId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.downloads })
      void qc.invalidateQueries({ queryKey: queryKeys.memos })
      void qc.invalidateQueries({ queryKey: ['activity'] })
    },
  })
}

export function useRecordDisputeSent() {
  const ds = useDataSource()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SendDisputeInput) => ds.recordDisputeSent(input),
    onSuccess: () => invalidateDisputeData(qc),
  })
}

export function useRecordGroupOutcome() {
  const ds = useDataSource()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { groupId: string; collection: Collection }) =>
      ds.recordGroupOutcome(input),
    onSuccess: () => invalidateDisputeData(qc),
  })
}

export function useRecordMemoDisputeOutcome() {
  const ds = useDataSource()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { disputeId: string; collection: Collection }) =>
      ds.recordMemoDisputeOutcome(input),
    onSuccess: () => invalidateDisputeData(qc),
  })
}

export function useMarkDisputeChecked() {
  const ds = useDataSource()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (disputeId: string) => ds.markDisputeChecked(disputeId),
    onSuccess: () => invalidateDisputeData(qc),
  })
}

export function useSetGroupNotPursued() {
  const ds = useDataSource()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { groupId: string; notPursued: boolean }) => ds.setGroupNotPursued(input),
    onSuccess: () => invalidateDisputeData(qc),
  })
}

export function useSetDisputeDraft() {
  const ds = useDataSource()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { excludedIds: string[]; draftDate: string | null }) =>
      ds.setDisputeDraft(input),
    // Ticking a finding updates at once; the refetch confirms it.
    onMutate: (input) => {
      qc.setQueriesData<{ excludedIds: string[]; draftDate: string | null }>({ queryKey: ['disputeContext'] }, (old) =>
        old ? { ...old, ...input } : old,
      )
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['disputeContext'] })
    },
  })
}
