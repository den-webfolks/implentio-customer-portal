/** Memo feature hooks — the only path from memo components to data. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDataSource } from '@/data/DataSourceProvider'
import type { BillerContact, EmailProvider } from '@/domain/types'
import {
  queryKeys,
  useActivity,
  useConfirmDisputeSent,
  useDiscardPreparedDispute,
  useDisputeContext,
  useDisputes,
  useDownloadState,
  useMemoDetail,
  useMemos,
  usePrepareDispute,
  useRecordDisputeSent,
  useRecordGroupOutcome,
  useRecordMemoDisputeOutcome,
  useRecordMemoDownload,
  useSetDisputeDraft,
  useSetGroupNotPursued,
} from '@/data/queries'

export {
  useActivity,
  useConfirmDisputeSent,
  useDiscardPreparedDispute,
  useDisputeContext,
  useDisputes,
  useDownloadState,
  useMemoDetail,
  useMemos,
  usePrepareDispute,
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

/** Review & send can save the address it was sent to as the Biller's dispute contact. */
export function useSaveBillerContact() {
  const ds = useDataSource()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (contact: BillerContact) => ds.saveBillerContact(contact),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.account }),
  })
}

/** The simulated OAuth connect from Review & send (nothing is sent on connect, note 308). */
export function useSetEmailAccountStatus() {
  const ds = useDataSource()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { provider: EmailProvider; status: 'connected' | 'not_connected' | 'expired' }) => ds.setEmailAccountStatus(input.provider, input.status),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.account }),
  })
}
