/** Account Settings (template ~2145–2410): profile, team, Biller contacts,
 *  integrations with simulated Gmail/Outlook OAuth. */
import { useState } from 'react'
import type { BillerContact, EmailProvider, TeamMember } from '@/domain/types'
import { useAccount, useAccountMutations } from './api'
import { fmtDateShort } from '@/domain/dates'
import { useClock } from '@/lib/clock'
import { Modal } from '@/ui/Modal/Modal'
import { useToast } from '@/ui/Toast/ToastProvider'

const label = (text: string) => (
  <span style={{ font: '600 12px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>{text}</span>
)

const PILL_TONES = {
  connected: { background: 'var(--imp-success-bg)', color: 'var(--imp-success)', borderColor: 'var(--imp-success)' },
  expired: { background: 'var(--imp-warning-bg)', color: '#8a5a05', borderColor: 'var(--imp-warning)' },
  not_connected: { background: 'var(--imp-gray-100)', color: 'var(--imp-fg-subtle)', borderColor: 'var(--imp-gray-300)' },
} as const

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function AccountPage() {
  const accountQ = useAccount()
  const m = useAccountMutations()
  const clock = useClock()
  const showToast = useToast()

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')

  const [editMember, setEditMember] = useState<TeamMember | null>(null)
  const [memberError, setMemberError] = useState('')
  const [memberNotice, setMemberNotice] = useState('')

  const [contactEdit, setContactEdit] = useState<BillerContact | null>(null)
  const [contactIsNew, setContactIsNew] = useState(false)
  const [contactError, setContactError] = useState('')

  const [connectProvider, setConnectProvider] = useState<EmailProvider | null>(null)
  const [connectPhase, setConnectPhase] = useState<'intro' | 'redirect'>('intro')
  const [disconnectProvider, setDisconnectProvider] = useState<EmailProvider | null>(null)

  if (!accountQ.data) return null
  const account = accountQ.data

  const sendInvite = () => {
    if (!inviteName.trim()) return setInviteError('Enter the member’s full name.')
    if (!EMAIL_RE.test(inviteEmail.trim())) return setInviteError('Enter a valid email address.')
    m.invite.mutate({ name: inviteName.trim(), email: inviteEmail.trim() })
    setInviteOpen(false)
    setInviteName('')
    setInviteEmail('')
    setInviteError('')
    showToast('ok', `Invitation sent to ${inviteEmail.trim()}`)
  }

  const saveMember = () => {
    if (!editMember) return
    if (!editMember.name.trim()) return setMemberError('Enter the member’s full name.')
    if (!EMAIL_RE.test(editMember.email.trim())) return setMemberError('Enter a valid email address.')
    m.update.mutate(editMember)
    setEditMember(null)
    setMemberError('')
    showToast('ok', 'Team member updated')
  }

  const saveContact = () => {
    if (!contactEdit) return
    if (!contactEdit.biller.trim()) return setContactError('Enter the Biller name.')
    if (!contactEdit.contact.trim()) return setContactError('Enter the contact name.')
    if (!EMAIL_RE.test(contactEdit.email.trim())) return setContactError('Enter a valid email address.')
    m.saveContact.mutate(contactEdit)
    setContactEdit(null)
    setContactError('')
    showToast('ok', 'Biller contact saved')
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
      showToast('ok', `${provider === 'gmail' ? 'Gmail' : 'Outlook'} connected`)
    }, 1300)
  }

  const infoRow = (l: string, v: string, last = false) => (
    <>
      <div style={{ padding: '14px 0', borderBottom: last ? undefined : '1px solid var(--imp-gray-200)', font: '600 13px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>{l}</div>
      <div style={{ padding: '14px 0', borderBottom: last ? undefined : '1px solid var(--imp-gray-200)', font: '600 14px var(--imp-font-body)', color: 'var(--imp-ink)' }}>{v}</div>
    </>
  )

  const emailSection = (provider: EmailProvider, name: string, initial: string) => {
    const acct = account.emailAccounts[provider]
    const status = acct.status
    const tone = PILL_TONES[status]
    const statusLabel =
      status === 'connected' ? 'Connected' : status === 'expired' ? 'Reconnect required' : 'Available'
    return (
      <div style={{ borderTop: '1.5px solid var(--imp-gray-200)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <span style={{ width: 34, height: 34, borderRadius: 999, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--imp-purple-100)', color: 'var(--imp-purple-500)', font: '700 13px var(--imp-font-display)' }}>
              {initial}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ font: '600 14px var(--imp-font-body)', color: 'var(--imp-ink)' }}>{name}</div>
              <div className="imp-small" style={{ margin: '2px 0 0' }}>
                Send approved Biller requests from your own email account.
              </div>
            </div>
          </div>
          <span className="ia-pill" style={tone}>
            {statusLabel}
          </span>
        </div>
        {status === 'connected' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px 18px', background: 'var(--imp-gray-100)', borderRadius: 10, padding: '12px 14px' }}>
              <div><div className="db-kpi-sub">Connected email</div><div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)', wordBreak: 'break-all' }}>{acct.address}</div></div>
              <div><div className="db-kpi-sub">Connected by</div><div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>{account.user.name}</div></div>
              <div><div className="db-kpi-sub">Connected</div><div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>{fmtDateShort(acct.connectedAt ? new Date(acct.connectedAt) : clock.now())}</div></div>
              <div><div className="db-kpi-sub">Permission</div><div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>Send email</div></div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={() => startConnect(provider)}>
                Reconnect
              </button>
              <button type="button" className="db-btn db-btn-secondary db-btn-sm" style={{ color: 'var(--imp-error)', borderColor: 'var(--imp-error)' }} onClick={() => setDisconnectProvider(provider)}>
                Disconnect
              </button>
              <button
                type="button"
                className="imp-small"
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--imp-purple-500)', textDecoration: 'underline' }}
                onClick={() => m.setEmailStatus.mutate({ provider, status: 'expired' })}
              >
                Preview: simulate token expiration
              </button>
            </div>
          </>
        )}
        {status === 'expired' && (
          <>
            <p className="imp-small" style={{ margin: 0, color: 'var(--imp-error)' }}>
              Your authorization has expired. Reconnect to keep sending from this account.
            </p>
            <div>
              <button type="button" className="db-btn db-btn-primary db-btn-sm" onClick={() => startConnect(provider)}>
                Reconnect
              </button>
            </div>
          </>
        )}
        {status === 'not_connected' && (
          <div>
            <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={() => startConnect(provider)}>
              Connect
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 720 }}>
      <div>
        <h1 className="db-h1" style={{ margin: 0 }}>
          Account Settings
        </h1>
        <p className="imp-small" style={{ margin: '8px 0 0' }}>
          View the account information associated with your Implentio profile.
        </p>
      </div>

      <div className="db-card" style={{ gap: 18 }}>
        <span className="db-eyebrow">Profile information</span>
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 0, borderTop: '1.5px solid var(--imp-gray-200)' }}>
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
          <button type="button" className="db-btn db-btn-primary db-btn-sm" onClick={() => setInviteOpen(true)}>
            Invite member
          </button>
        </div>
        <p className="imp-small" style={{ margin: 0 }}>
          People associated with Implentio. Roles and permissions are not configurable in this release.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 0, borderTop: '1.5px solid var(--imp-gray-200)' }}>
          <div style={{ padding: '8px 0', font: '600 11px var(--imp-font-body)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--imp-fg-subtle)' }}>Name</div>
          <div style={{ padding: '8px 0', font: '600 11px var(--imp-font-body)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--imp-fg-subtle)' }}>Email</div>
          <div style={{ padding: '8px 0', font: '600 11px var(--imp-font-body)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--imp-fg-subtle)', textAlign: 'right' }}>Status</div>
          <div style={{ padding: '8px 0' }} />
          {account.team.map((p) => (
            <MemberRow key={p.id} member={p} onEdit={() => setEditMember({ ...p })} />
          ))}
        </div>
      </div>

      <div className="db-card" style={{ gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span className="db-eyebrow">Biller contacts</span>
          <button
            type="button"
            className="db-btn db-btn-primary db-btn-sm"
            onClick={() => {
              setContactIsNew(true)
              setContactEdit({ id: `contact-${clock.now().getTime()}`, biller: '', contact: '', email: '', cc: '', dispute: false, active: true })
            }}
          >
            Add Biller contact
          </button>
        </div>
        <p className="imp-small" style={{ margin: 0 }}>
          These contacts populate the recipients when you prepare a credit memo for a biller. A biller may have one default dispute contact at a time.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {account.billerContacts.map((c) => (
            <div key={c.id} style={{ border: '1.5px solid var(--imp-gray-300)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <strong style={{ font: '600 15px var(--imp-font-display)', color: 'var(--imp-ink)' }}>{c.biller}</strong>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    className="ia-pill"
                    style={
                      c.active
                        ? { background: 'var(--imp-success-bg)', color: 'var(--imp-success)', borderColor: 'var(--imp-success)' }
                        : { background: 'var(--imp-gray-100)', color: 'var(--imp-fg-subtle)', borderColor: 'var(--imp-gray-300)' }
                    }
                  >
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    type="button"
                    className="db-btn db-btn-secondary db-btn-sm"
                    onClick={() => {
                      setContactIsNew(false)
                      setContactEdit({ ...c })
                    }}
                  >
                    Edit
                  </button>
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px 18px' }}>
                <div><div className="db-kpi-sub">Contact</div><div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>{c.contact}</div></div>
                <div><div className="db-kpi-sub">Email</div><div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)', wordBreak: 'break-all' }}>{c.email}</div></div>
                <div><div className="db-kpi-sub">CC recipients</div><div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)', wordBreak: 'break-all' }}>{c.cc || '—'}</div></div>
                <div><div className="db-kpi-sub">Dispute routing</div><div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>{c.dispute ? 'Default dispute contact' : '—'}</div></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="db-card" style={{ gap: 14 }}>
        <span className="db-eyebrow">Integrations</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderTop: '1.5px solid var(--imp-gray-200)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '13px 0', borderBottom: '1px solid var(--imp-gray-200)' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ font: '600 14px var(--imp-font-body)', color: 'var(--imp-ink)' }}>Shopify</div>
              <div className="imp-small" style={{ margin: '2px 0 0' }}>Order and fulfillment data</div>
            </div>
            <span className="ia-pill" style={{ background: 'var(--imp-success-bg)', color: 'var(--imp-success)', borderColor: 'var(--imp-success)' }}>
              Connected
            </span>
          </div>
        </div>
        {emailSection('gmail', 'Gmail', 'G')}
        {emailSection('outlook', 'Outlook', 'O')}
        <p className="imp-small" style={{ margin: 0 }}>
          Prepared messages can be sent from a connected Gmail or Outlook account, or downloaded and sent manually.
        </p>
      </div>

      {/* Invite member */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite team member"
        footer={
          <>
            <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={() => setInviteOpen(false)}>
              Cancel
            </button>
            <button type="button" className="db-btn db-btn-primary db-btn-sm" onClick={sendInvite}>
              Send invite
            </button>
          </>
        }
      >
        <p className="imp-small" style={{ margin: 0 }}>
          They will receive an email invitation to join Implentio for your account.
        </p>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {label('Full name')}
          <input className="ia-input" placeholder="Jordan Lee" value={inviteName} onChange={(e) => setInviteName(e.target.value)} style={{ width: '100%' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {label('Email address')}
          <input className="ia-input" type="email" placeholder="jordan@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} style={{ width: '100%' }} />
        </label>
        {inviteError && (
          <p className="imp-small" style={{ margin: 0, color: 'var(--imp-error)' }}>
            {inviteError}
          </p>
        )}
      </Modal>

      {/* Edit member */}
      <Modal open={!!editMember} onClose={() => setEditMember(null)} title="Edit team member" width={440}>
        {editMember && (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {label('Full name')}
              <input className="ia-input" value={editMember.name} onChange={(e) => setEditMember({ ...editMember, name: e.target.value })} style={{ width: '100%' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {label('Email address')}
              <input className="ia-input" type="email" value={editMember.email} onChange={(e) => setEditMember({ ...editMember, email: e.target.value })} style={{ width: '100%' }} />
            </label>
            {memberError && (
              <p className="imp-small" style={{ margin: 0, color: 'var(--imp-error)' }}>
                {memberError}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={() => setEditMember(null)}>
                Cancel
              </button>
              <button type="button" className="db-btn db-btn-primary db-btn-sm" onClick={saveMember}>
                Save changes
              </button>
            </div>
            <div style={{ borderTop: '1.5px solid var(--imp-gray-200)', marginTop: 2, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ font: '600 11px var(--imp-font-body)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--imp-fg-subtle)' }}>
                Account actions
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={() => setMemberNotice(`Invitation resent to ${editMember.email}.`)}>
                  Resend invite
                </button>
                <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={() => setMemberNotice(`Password reset email sent to ${editMember.email}.`)}>
                  Reset password
                </button>
                <button
                  type="button"
                  className="db-btn db-btn-secondary db-btn-sm"
                  style={{ color: 'var(--imp-error)', borderColor: 'var(--imp-error)' }}
                  onClick={() => {
                    m.revoke.mutate(editMember.id)
                    setEditMember(null)
                    showToast('ok', 'Access revoked')
                  }}
                >
                  Revoke access
                </button>
              </div>
              {memberNotice && (
                <p className="imp-small" style={{ margin: 0, color: 'var(--imp-success)' }}>
                  {memberNotice}
                </p>
              )}
            </div>
          </>
        )}
      </Modal>

      {/* Add/edit biller contact */}
      <Modal
        open={!!contactEdit}
        onClose={() => setContactEdit(null)}
        title={contactIsNew ? 'Add Biller contact' : 'Edit Biller contact'}
        width={480}
        footer={
          <>
            <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={() => setContactEdit(null)}>
              Cancel
            </button>
            <button type="button" className="db-btn db-btn-primary db-btn-sm" onClick={saveContact}>
              Save contact
            </button>
          </>
        }
      >
        {contactEdit && (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {label('Biller name')}
              <input className="ia-input" placeholder="QuickBox" value={contactEdit.biller} onChange={(e) => setContactEdit({ ...contactEdit, biller: e.target.value })} style={{ width: '100%' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {label('Contact name')}
              <input className="ia-input" placeholder="Dana Reyes" value={contactEdit.contact} onChange={(e) => setContactEdit({ ...contactEdit, contact: e.target.value })} style={{ width: '100%' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {label('Email')}
              <input className="ia-input" type="email" placeholder="billing@quickbox.com" value={contactEdit.email} onChange={(e) => setContactEdit({ ...contactEdit, email: e.target.value })} style={{ width: '100%' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {label('CC recipients')}
              <input className="ia-input" placeholder="ops@quickbox.com" value={contactEdit.cc} onChange={(e) => setContactEdit({ ...contactEdit, cc: e.target.value })} style={{ width: '100%' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {label('Status')}
              <select className="ia-input" value={contactEdit.active ? 'active' : 'inactive'} onChange={(e) => setContactEdit({ ...contactEdit, active: e.target.value === 'active' })} style={{ padding: '8px 10px', width: '100%' }}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={contactEdit.dispute} onChange={(e) => setContactEdit({ ...contactEdit, dispute: e.target.checked })} />
              <span style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>Default dispute contact for this biller</span>
            </label>
            <p className="imp-small" style={{ margin: 0 }}>
              Setting this as the default dispute contact replaces any other default for the same biller.
            </p>
            {contactError && (
              <p className="imp-small" style={{ margin: 0, color: 'var(--imp-error)' }}>
                {contactError}
              </p>
            )}
          </>
        )}
      </Modal>

      {/* Connect email (simulated OAuth) */}
      <Modal
        open={!!connectProvider}
        onClose={() => setConnectProvider(null)}
        title={`Connect your ${connectProvider === 'outlook' ? 'Outlook' : 'Gmail'} account`}
        width={480}
      >
        {connectPhase === 'intro' ? (
          <>
            <p className="imp-small" style={{ margin: 0 }}>
              You&rsquo;ll be redirected to {connectProvider === 'outlook' ? 'Microsoft' : 'Google'} to authorize Implentio to send email on your behalf. Implentio only sends messages you review and approve.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={() => setConnectProvider(null)}>
                Cancel
              </button>
              <button type="button" className="db-btn db-btn-primary db-btn-sm" onClick={continueConnect}>
                Continue
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
            <span style={{ width: 16, height: 16, borderRadius: 999, border: '2px solid var(--imp-purple-200)', borderTopColor: 'var(--imp-purple-500)', animation: 'imp-spin 0.9s linear infinite', flex: 'none' }} />
            <span style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>
              Redirecting to {connectProvider === 'outlook' ? 'Microsoft' : 'Google'}…
            </span>
          </div>
        )}
      </Modal>

      {/* Disconnect confirm */}
      <Modal
        open={!!disconnectProvider}
        onClose={() => setDisconnectProvider(null)}
        title={`Disconnect ${disconnectProvider === 'outlook' ? 'Outlook' : 'Gmail'}?`}
        width={440}
        footer={
          <>
            <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={() => setDisconnectProvider(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="db-btn db-btn-primary db-btn-sm"
              style={{ background: 'var(--imp-error)' }}
              onClick={() => {
                if (disconnectProvider) m.setEmailStatus.mutate({ provider: disconnectProvider, status: 'not_connected' })
                setDisconnectProvider(null)
                showToast('ok', 'Account disconnected')
              }}
            >
              Disconnect
            </button>
          </>
        }
      >
        <p className="imp-small" style={{ margin: 0 }}>
          Prepared messages will no longer send from this account. You can reconnect at any time; manual download and copy remain available.
        </p>
      </Modal>
    </div>
  )
}

function MemberRow({ member, onEdit }: { member: TeamMember; onEdit: () => void }) {
  return (
    <>
      <div style={{ padding: '12px 0', borderTop: '1px solid var(--imp-gray-200)', font: '600 14px var(--imp-font-body)', color: 'var(--imp-ink)' }}>{member.name}</div>
      <div style={{ padding: '12px 0', borderTop: '1px solid var(--imp-gray-200)', font: '500 13px var(--imp-font-body)', color: 'var(--imp-fg-muted)', wordBreak: 'break-all' }}>{member.email}</div>
      <div style={{ padding: '12px 0', borderTop: '1px solid var(--imp-gray-200)', font: '500 13px var(--imp-font-body)', color: 'var(--imp-fg-muted)', textAlign: 'right' }}>{member.status}</div>
      <div style={{ padding: '12px 0 12px 16px', borderTop: '1px solid var(--imp-gray-200)', textAlign: 'right' }}>
        <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={onEdit}>
          Edit
        </button>
      </div>
    </>
  )
}
