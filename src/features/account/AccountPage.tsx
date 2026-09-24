/** Account Settings (template ~2145–2410): profile, team, Biller contacts,
 *  integrations with simulated Gmail/Outlook OAuth. */
import { useState, type ReactNode } from 'react'
import type { BillerContact, EmailAccount, EmailProvider, TeamMember } from '@/domain/types'
import { useAccount, useAccountMutations } from './api'
import { fmtDateShort } from '@/domain/dates'
import { useClock } from '@/lib/clock'
import { Modal } from '@/ui/Modal/Modal'
import { useToast } from '@/ui/Toast/ToastProvider'
import { Button } from '@/ui/Button/Button'
import { Link } from '@/ui/Link/Link'
import { TextField } from '@/ui/Form/TextField'
import { Select } from '@/ui/Form/Select'
import { Checkbox } from '@/ui/Form/Choice'
import { StatusChip, type StatusTone } from '@/ui/Chip/StatusChip'
import styles from './AccountPage.module.css'
import { Avatar, Spinner } from '@/ui/Display/Display'

const EMAIL_TONE: Record<EmailAccount['status'], StatusTone> = {
  connected: 'success',
  expired: 'attention',
  not_connected: 'muted',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const DIVIDER = '1px solid var(--ds-stroke-disabled)'

type FieldError<F extends string> = { field: F; text: string } | null

function errorProps<F extends string>(error: FieldError<F>, field: F) {
  return error?.field === field ? { validation: 'invalid' as const, message: error.text } : {}
}

function KeyValue({ label, children, wrapAnywhere = false }: { label: string; children: ReactNode; wrapAnywhere?: boolean }) {
  return (
    <div>
      <div className="ds-caption-small ds-muted">{label}</div>
      <div className="ds-body-base" style={{ fontWeight: 500, overflowWrap: wrapAnywhere ? 'anywhere' : undefined }}>
        {children}
      </div>
    </div>
  )
}

export function AccountPage() {
  const accountQ = useAccount()
  const m = useAccountMutations()
  const clock = useClock()
  const showToast = useToast()

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState<FieldError<'name' | 'email'>>(null)

  const [editMember, setEditMember] = useState<TeamMember | null>(null)
  const [memberError, setMemberError] = useState<FieldError<'name' | 'email'>>(null)
  const [memberNotice, setMemberNotice] = useState('')

  const [contactEdit, setContactEdit] = useState<BillerContact | null>(null)
  const [contactIsNew, setContactIsNew] = useState(false)
  const [contactError, setContactError] = useState<FieldError<'biller' | 'contact' | 'email'>>(null)

  const [connectProvider, setConnectProvider] = useState<EmailProvider | null>(null)
  const [connectPhase, setConnectPhase] = useState<'intro' | 'redirect'>('intro')
  const [disconnectProvider, setDisconnectProvider] = useState<EmailProvider | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<TeamMember | null>(null)

  if (!accountQ.data) return null
  const account = accountQ.data

  const sendInvite = () => {
    if (!inviteName.trim()) return setInviteError({ field: 'name', text: 'Enter the member’s full name.' })
    if (!EMAIL_RE.test(inviteEmail.trim())) return setInviteError({ field: 'email', text: 'Enter a valid email address.' })
    m.invite.mutate({ name: inviteName.trim(), email: inviteEmail.trim() })
    setInviteOpen(false)
    setInviteName('')
    setInviteEmail('')
    setInviteError(null)
    showToast('positive', `Invitation sent to ${inviteEmail.trim()}`)
  }

  const saveMember = () => {
    if (!editMember) return
    if (!editMember.name.trim()) return setMemberError({ field: 'name', text: 'Enter the member’s full name.' })
    if (!EMAIL_RE.test(editMember.email.trim())) return setMemberError({ field: 'email', text: 'Enter a valid email address.' })
    m.update.mutate(editMember)
    setEditMember(null)
    setMemberError(null)
    showToast('positive', 'Team member updated')
  }

  const saveContact = () => {
    if (!contactEdit) return
    if (!contactEdit.biller.trim()) return setContactError({ field: 'biller', text: 'Enter the Biller name.' })
    if (!contactEdit.contact.trim()) return setContactError({ field: 'contact', text: 'Enter the contact name.' })
    if (!EMAIL_RE.test(contactEdit.email.trim())) return setContactError({ field: 'email', text: 'Enter a valid email address.' })
    m.saveContact.mutate(contactEdit)
    setContactEdit(null)
    setContactError(null)
    showToast('positive', 'Biller contact saved')
  }

  const startConnect = (provider: EmailProvider) => {
    setConnectProvider(provider)
    setConnectPhase('intro')
  }

  const continueConnect = () => {
    if (!connectProvider) return
    setConnectPhase('redirect')
    const provider = connectProvider
    setTimeout(() => {
      m.setEmailStatus.mutate({ provider, status: 'connected' })
      setConnectProvider(null)
      showToast('positive', `${provider === 'gmail' ? 'Gmail' : 'Outlook'} connected`)
    }, 1300)
  }

  const infoRow = (l: string, v: string, last = false) => (
    <>
      <div className="ds-body-base ds-muted" style={{ padding: '14px 0', borderBottom: last ? undefined : DIVIDER, fontWeight: 500 }}>
        {l}
      </div>
      <div className="ds-body-base" style={{ padding: '14px 0', borderBottom: last ? undefined : DIVIDER, fontWeight: 500 }}>
        {v}
      </div>
    </>
  )

  const emailSection = (provider: EmailProvider, name: string) => {
    const acct = account.emailAccounts[provider]
    const status = acct.status
    const statusLabel =
      status === 'connected' ? 'Connected' : status === 'expired' ? 'Reconnect required' : 'Available'
    return (
      <div style={{ borderTop: DIVIDER, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <Avatar name={name} />
            <div style={{ minWidth: 0 }}>
              <div className="ds-body-base" style={{ fontWeight: 600 }}>
                {name}
              </div>
              <div className="imp-small" style={{ margin: '2px 0 0' }}>
                Send approved Biller requests from your own email account.
              </div>
            </div>
          </div>
          <StatusChip tone={EMAIL_TONE[status]}>{statusLabel}</StatusChip>
        </div>
        {status === 'connected' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px 18px', background: 'var(--ds-bg-disabled)', borderRadius: 'var(--ds-radius-large)', padding: '12px 14px' }}>
              <KeyValue label="Connected email" wrapAnywhere>
                {acct.address}
              </KeyValue>
              <KeyValue label="Connected by">{account.user.name}</KeyValue>
              <KeyValue label="Connected">{fmtDateShort(acct.connectedAt ? new Date(acct.connectedAt) : clock.now())}</KeyValue>
              <KeyValue label="Permission">Send email</KeyValue>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button size="small" onClick={() => startConnect(provider)}>
                Reconnect
              </Button>
              <Button size="small" variant="danger" onClick={() => setDisconnectProvider(provider)}>
                Disconnect
              </Button>
              <Link variant="accent" size="small" underline style={{ marginInlineStart: 'auto' }} onClick={() => m.setEmailStatus.mutate({ provider, status: 'expired' })}>
                Preview: simulate token expiration
              </Link>
            </div>
          </>
        )}
        {status === 'expired' && (
          <>
            <p className="imp-small" style={{ margin: 0, color: 'var(--ds-fg-danger)' }}>
              Your authorization has expired. Reconnect to keep sending from this account.
            </p>
            <div>
              <Button size="small" variant="primary" onClick={() => startConnect(provider)}>
                Reconnect
              </Button>
            </div>
          </>
        )}
        {status === 'not_connected' && (
          <div>
            <Button size="small" onClick={() => startConnect(provider)}>
              Connect
            </Button>
          </div>
        )}
      </div>
    )
  }

  const teamHead = (text: string, align?: 'end') => (
    <div className={`ds-body-small ds-muted ${styles.teamHead}`} style={{ padding: '8px 0', textAlign: align }}>
      {text}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 720 }}>
      <div>
        <h1 className="db-h1" style={{ margin: 0 }}>
          Account settings
        </h1>
        <p className="imp-small" style={{ margin: '8px 0 0' }}>
          View the account information associated with your Implentio profile.
        </p>
      </div>

      <div className="db-card" style={{ gap: 18 }}>
        <span className="db-eyebrow">Profile information</span>
        <div className={styles.infoGrid}>
          {infoRow('Name', account.user.name)}
          {infoRow('Company', 'Implentio')}
          {infoRow('Email address', account.user.email)}
          {infoRow('Account created', 'June 1, 2026', true)}
        </div>
        <p className="imp-small" style={{ margin: 0, paddingTop: 2 }}>
          To update your account information, contact your Implentio customer representative.
        </p>
      </div>

      <div className="db-card" style={{ gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span className="db-eyebrow">Team</span>
          <Button size="small" variant="primary" onClick={() => setInviteOpen(true)}>
            Invite member
          </Button>
        </div>
        <p className="imp-small" style={{ margin: 0 }}>
          People associated with Implentio. Roles and permissions are not configurable in this release.
        </p>
        <div className={styles.teamGrid}>
          {teamHead('Name')}
          {teamHead('Email')}
          {teamHead('Status', 'end')}
          <div className={styles.teamHead} style={{ padding: '8px 0' }} />
          {account.team.map((p) => (
            <MemberRow key={p.id} member={p} onEdit={() => setEditMember({ ...p })} />
          ))}
        </div>
      </div>

      <div className="db-card" style={{ gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span className="db-eyebrow">Biller contacts</span>
          <Button
            size="small"
            variant="primary"
            onClick={() => {
              setContactIsNew(true)
              setContactEdit({ id: `contact-${clock.now().getTime()}`, biller: '', contact: '', email: '', cc: '', dispute: false, active: true })
            }}
          >
            Add Biller contact
          </Button>
        </div>
        <p className="imp-small" style={{ margin: 0 }}>
          These contacts populate the recipients when you prepare a credit memo for a biller. A biller may have one default dispute contact at a time.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {account.billerContacts.map((c) => (
            <div
              key={c.id}
              style={{
                border: DIVIDER,
                borderRadius: 'var(--ds-radius-large)',
                boxShadow: 'var(--ds-shadow-disabled)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                background: 'var(--ds-bg-default)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <strong className="ds-heading-tiny">{c.biller}</strong>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <StatusChip tone={c.active ? 'success' : 'muted'}>{c.active ? 'Active' : 'Inactive'}</StatusChip>
                  <Button
                    size="small"
                    onClick={() => {
                      setContactIsNew(false)
                      setContactEdit({ ...c })
                    }}
                  >
                    Edit
                  </Button>
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px 18px' }}>
                <KeyValue label="Contact">{c.contact}</KeyValue>
                <KeyValue label="Email" wrapAnywhere>
                  {c.email}
                </KeyValue>
                <KeyValue label="CC recipients" wrapAnywhere>
                  {c.cc || '—'}
                </KeyValue>
                <KeyValue label="Dispute routing">{c.dispute ? 'Default dispute contact' : '—'}</KeyValue>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="db-card" style={{ gap: 14 }}>
        <span className="db-eyebrow">Integrations</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderTop: DIVIDER }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '13px 0', borderBottom: DIVIDER }}>
            <div style={{ minWidth: 0 }}>
              <div className="ds-body-base" style={{ fontWeight: 600 }}>
                Shopify
              </div>
              <div className="imp-small" style={{ margin: '2px 0 0' }}>
                Order and fulfillment data
              </div>
            </div>
            <StatusChip tone="success">Connected</StatusChip>
          </div>
        </div>
        {emailSection('gmail', 'Gmail')}
        {emailSection('outlook', 'Outlook')}
        <p className="imp-small" style={{ margin: 0 }}>
          Prepared messages can be sent from a connected Gmail or Outlook account, or downloaded and sent manually.
        </p>
      </div>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite team member"
        width={420}
        footerStart={<Button onClick={() => setInviteOpen(false)}>Cancel</Button>}
        footer={
          <Button variant="primary" onClick={sendInvite}>
            Send invite
          </Button>
        }
      >
        <p className="imp-small" style={{ margin: 0 }}>
          They will receive an email invitation to join Implentio for your account.
        </p>
        <TextField label="Full name" placeholder="Jordan Lee" value={inviteName} onChange={(e) => setInviteName(e.target.value)} {...errorProps(inviteError, 'name')} />
        <TextField
          label="Email address"
          type="email"
          placeholder="jordan@company.com"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          {...errorProps(inviteError, 'email')}
        />
      </Modal>

      <Modal
        open={!!editMember}
        onClose={() => setEditMember(null)}
        title="Edit team member"
        width={440}
        footerStart={<Button onClick={() => setEditMember(null)}>Cancel</Button>}
        footer={
          <Button variant="primary" onClick={saveMember}>
            Save changes
          </Button>
        }
      >
        {editMember && (
          <>
            <TextField label="Full name" value={editMember.name} onChange={(e) => setEditMember({ ...editMember, name: e.target.value })} {...errorProps(memberError, 'name')} />
            <TextField
              label="Email address"
              type="email"
              value={editMember.email}
              onChange={(e) => setEditMember({ ...editMember, email: e.target.value })}
              {...errorProps(memberError, 'email')}
            />
            <div style={{ borderTop: DIVIDER, marginTop: 2, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="ds-caption-small ds-muted" style={{ textTransform: 'uppercase' }}>
                Account actions
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Button size="small" onClick={() => setMemberNotice(`Invitation resent to ${editMember.email}.`)}>
                  Resend invite
                </Button>
                <Button size="small" onClick={() => setMemberNotice(`Password reset email sent to ${editMember.email}.`)}>
                  Reset password
                </Button>
                <Button
                  size="small"
                  variant="danger"
                  onClick={() => {
                    setRevokeTarget(editMember)
                    setEditMember(null)
                  }}
                >
                  Revoke access
                </Button>
              </div>
              {memberNotice && (
                <p className="imp-small" style={{ margin: 0, color: 'var(--ds-fg-success)' }}>
                  {memberNotice}
                </p>
              )}
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={!!contactEdit}
        onClose={() => setContactEdit(null)}
        title={contactIsNew ? 'Add Biller contact' : 'Edit Biller contact'}
        width={480}
        footerStart={<Button onClick={() => setContactEdit(null)}>Cancel</Button>}
        footer={
          <Button variant="primary" onClick={saveContact}>
            Save contact
          </Button>
        }
      >
        {contactEdit && (
          <>
            <TextField
              label="Biller name"
              placeholder="QuickBox"
              value={contactEdit.biller}
              onChange={(e) => setContactEdit({ ...contactEdit, biller: e.target.value })}
              {...errorProps(contactError, 'biller')}
            />
            <TextField
              label="Contact name"
              placeholder="Dana Reyes"
              value={contactEdit.contact}
              onChange={(e) => setContactEdit({ ...contactEdit, contact: e.target.value })}
              {...errorProps(contactError, 'contact')}
            />
            <TextField
              label="Email"
              type="email"
              placeholder="billing@quickbox.com"
              value={contactEdit.email}
              onChange={(e) => setContactEdit({ ...contactEdit, email: e.target.value })}
              {...errorProps(contactError, 'email')}
            />
            <TextField label="CC recipients" placeholder="ops@quickbox.com" value={contactEdit.cc} onChange={(e) => setContactEdit({ ...contactEdit, cc: e.target.value })} />
            <Select
              label="Status"
              fullWidth
              value={contactEdit.active ? 'active' : 'inactive'}
              onValueChange={(v) => setContactEdit({ ...contactEdit, active: v === 'active' })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
            <Checkbox
              label="Default dispute contact for this biller"
              description="Setting this as the default dispute contact replaces any other default for the same biller."
              checked={contactEdit.dispute}
              onCheckedChange={(checked) => setContactEdit({ ...contactEdit, dispute: checked })}
            />
          </>
        )}
      </Modal>

      <Modal
        open={!!connectProvider}
        onClose={() => setConnectProvider(null)}
        title={`Connect your ${connectProvider === 'outlook' ? 'Outlook' : 'Gmail'} account`}
        width={480}
        footerStart={connectPhase === 'intro' ? <Button onClick={() => setConnectProvider(null)}>Cancel</Button> : undefined}
        footer={
          connectPhase === 'intro' ? (
            <Button variant="primary" onClick={continueConnect}>
              Continue
            </Button>
          ) : undefined
        }
      >
        {connectPhase === 'intro' ? (
          <p className="imp-small" style={{ margin: 0 }}>
            You&rsquo;ll be redirected to {connectProvider === 'outlook' ? 'Microsoft' : 'Google'} to authorize Implentio to send email on your behalf. Implentio only sends messages you review and approve.
          </p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
            <Spinner />
            <span className="ds-body-base" style={{ fontWeight: 500 }}>
              Redirecting to {connectProvider === 'outlook' ? 'Microsoft' : 'Google'}…
            </span>
          </div>
        )}
      </Modal>

      <Modal
        open={!!disconnectProvider}
        onClose={() => setDisconnectProvider(null)}
        title={`Disconnect ${disconnectProvider === 'outlook' ? 'Outlook' : 'Gmail'}?`}
        width={440}
        footerStart={<Button onClick={() => setDisconnectProvider(null)}>Cancel</Button>}
        footer={
          <Button
            variant="danger"
            onClick={() => {
              if (disconnectProvider) m.setEmailStatus.mutate({ provider: disconnectProvider, status: 'not_connected' })
              setDisconnectProvider(null)
              showToast('positive', 'Account disconnected')
            }}
          >
            Disconnect
          </Button>
        }
      >
        <p className="imp-small" style={{ margin: 0 }}>
          Prepared messages will no longer send from this account. You can reconnect at any time; manual download and copy remain available.
        </p>
      </Modal>

      <Modal
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        title={`Revoke access for ${revokeTarget?.name ?? ''}?`}
        width={440}
        footerStart={<Button onClick={() => setRevokeTarget(null)}>Cancel</Button>}
        footer={
          <Button
            variant="danger"
            onClick={() => {
              if (revokeTarget) m.revoke.mutate(revokeTarget.id)
              setRevokeTarget(null)
              showToast('positive', 'Access revoked')
            }}
          >
            Revoke access
          </Button>
        }
      >
        <p className="imp-small" style={{ margin: 0 }}>
          {revokeTarget?.name} will no longer be able to sign in to Implentio. You can invite them again later.
        </p>
      </Modal>
    </div>
  )
}

function MemberRow({ member, onEdit }: { member: TeamMember; onEdit: () => void }) {
  const cell = { padding: '12px 0', borderTop: DIVIDER } as const
  return (
    <>
      <div className={`ds-body-base ${styles.memberName}`} style={{ ...cell, fontWeight: 600 }}>
        {member.name}
      </div>
      <div className={`ds-body-base ds-muted ${styles.memberEmail}`} style={{ ...cell, overflowWrap: 'anywhere' }}>
        {member.email}
      </div>
      <div className={styles.memberStatus} style={{ ...cell, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <StatusChip tone={member.status === 'Active' ? 'success' : 'muted'}>{member.status}</StatusChip>
      </div>
      <div className={styles.memberEdit} style={{ ...cell, paddingBlock: 12, paddingInline: '16px 0', textAlign: 'end' }}>
        <Button size="small" onClick={onEdit}>
          Edit
        </Button>
      </div>
    </>
  )
}
