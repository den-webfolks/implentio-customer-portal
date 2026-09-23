/** Memo feature hooks — the only path from memo components to data. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDataSource } from '@/data/DataSourceProvider'
import {
  queryKeys,
  useDownloadState,
  useMarkGroupsPursued,
  useMemoDetail,
  useMemos,
  useRecordGroupOutcome,
  useRecordMemoDownload,
  useActivity,
} from '@/data/queries'

export {
  useMemoDetail,
  useMemos,
  useDownloadState,
  useMarkGroupsPursued,
  useRecordGroupOutcome,
  useRecordMemoDownload,
  useActivity,
}

export function useDisputeContext() {
  const ds = useDataSource()
  return useQuery({ queryKey: ['disputeContext'], queryFn: () => ds.getDisputeContext() })
}

export function useSetDisputeDraft() {
  const ds = useDataSource()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { excludedIds: string[]; draftDate: string | null }) =>
      ds.setDisputeDraft(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['disputeContext'] })
      void qc.invalidateQueries({ queryKey: ['memo'] })
    },
  })
}

export function useIncludeInAnotherRequest() {
  const ds = useDataSource()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (groupId: string) => ds.includeGroupInAnotherRequest(groupId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['memo'] })
      void qc.invalidateQueries({ queryKey: queryKeys.outcomeRows })
    },
  })
}

export function useAccountForDispute() {
  const ds = useDataSource()
  return useQuery({ queryKey: queryKeys.account, queryFn: () => ds.getAccount() })
}
