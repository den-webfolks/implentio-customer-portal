/** Account feature hooks — the only path from account components to data. */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, useAccount } from '@/data/queries'
import { useDataSource } from '@/data/DataSourceProvider'
import type { BillerContact, EmailProvider, TeamMember } from '@/domain/types'

export { useAccount }

export function useAccountMutations() {
  const ds = useDataSource()
  const qc = useQueryClient()
  const invalidate = () => void qc.invalidateQueries({ queryKey: queryKeys.account })
  return {
    invite: useMutation({
      mutationFn: (input: { name: string; email: string }) => ds.inviteMember(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: (member: TeamMember) => ds.updateMember(member),
      onSuccess: invalidate,
    }),
    revoke: useMutation({
      mutationFn: (id: string) => ds.revokeMember(id),
      onSuccess: invalidate,
    }),
    saveContact: useMutation({
      mutationFn: (contact: BillerContact) => ds.saveBillerContact(contact),
      onSuccess: invalidate,
    }),
    setEmailStatus: useMutation({
      mutationFn: (input: {
        provider: EmailProvider
        status: 'connected' | 'not_connected' | 'expired'
      }) => ds.setEmailAccountStatus(input.provider, input.status),
      onSuccess: invalidate,
    }),
  }
}
