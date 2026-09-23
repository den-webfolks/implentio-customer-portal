/**
 * Thin TanStack Query hooks over the AppDataSource seam. Feature api.ts
 * modules re-export/compose these; screens never touch the source directly.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Collection } from '@/domain/types'
import { useDataSource } from './DataSourceProvider'

export const queryKeys = {
  memos: ['memos'] as const,
  memoDetail: (id: string) => ['memo', id] as const,
  downloads: ['downloads'] as const,
  outcomeRows: ['outcomeRows'] as const,
  account: ['account'] as const,
  activity: ['activity'] as const,
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

export function useActivity() {
  const ds = useDataSource()
  return useQuery({ queryKey: queryKeys.activity, queryFn: () => ds.getActivity() })
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
      void qc.invalidateQueries({ queryKey: queryKeys.activity })
    },
  })
}

export function useMarkGroupsPursued() {
  const ds = useDataSource()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { groupIds: string[]; via: 'connected' | 'manual' }) =>
      ds.markGroupsPursued(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['memo'] })
      void qc.invalidateQueries({ queryKey: queryKeys.outcomeRows })
    },
  })
}

export function useRecordGroupOutcome() {
  const ds = useDataSource()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { groupId: string; collection: Collection }) =>
      ds.recordGroupOutcome(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['memo'] })
      void qc.invalidateQueries({ queryKey: queryKeys.outcomeRows })
    },
  })
}
