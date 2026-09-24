/** Memo feature hooks — the only path from memo components to data. */
import { useQuery } from '@tanstack/react-query'
import { useDataSource } from '@/data/DataSourceProvider'
import {
  queryKeys,
  useActivity,
  useDisputeContext,
  useDisputes,
  useDownloadState,
  useMarkDisputeChecked,
  useMemoDetail,
  useMemos,
  useRecordDisputeSent,
  useRecordGroupOutcome,
  useRecordMemoDisputeOutcome,
  useRecordMemoDownload,
  useSetDisputeDraft,
  useSetGroupNotPursued,
} from '@/data/queries'

export {
  useActivity,
  useDisputeContext,
  useDisputes,
  useDownloadState,
  useMarkDisputeChecked,
  useMemoDetail,
  useMemos,
  useRecordDisputeSent,
  useRecordGroupOutcome,
  useRecordMemoDisputeOutcome,
  useRecordMemoDownload,
  useSetDisputeDraft,
  useSetGroupNotPursued,
}

export function useAccountForDispute() {
  const ds = useDataSource()
  return useQuery({ queryKey: queryKeys.account, queryFn: () => ds.getAccount() })
}
