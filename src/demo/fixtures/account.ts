/** Account fixtures — ported from freshState/threePlContacts/prepCsm
 *  (template ~7275–7284, ~13268–13280). */
import type { AccountSettings } from '@/domain/types'

export const accountFixture: AccountSettings = {
  user: {
    name: 'Tori Matthews',
    email: 'tori@implentio.com',
    org: 'Implentio Operations',
    initials: 'TM',
  },
  team: [
    { id: 'tm-tori', name: 'Tori Matthews', email: 'tori@implentio.com', status: 'Active' },
    { id: 'tm-renee', name: 'Renee Alvarez', email: 'renee@implentio.com', status: 'Active' },
    { id: 'tm-sam', name: 'Sam Okafor', email: 'sam@implentio.com', status: 'Invited' },
  ],
  billerContacts: [
    {
      id: 'quickbox',
      biller: 'QuickBox',
      contact: 'Dana Reyes',
      email: 'billing@quickbox.com',
      cc: 'ops@quickbox.com',
      dispute: true,
      active: true,
    },
    {
      id: 'shipbob',
      biller: 'ShipBob',
      contact: 'Marcus Hale',
      email: 'ar@shipbob.example.com',
      cc: '',
      dispute: true,
      active: true,
    },
    {
      id: 'flowspace',
      biller: 'Flowspace',
      contact: 'Priya Nair',
      email: 'billing@flowspace.example.com',
      cc: '',
      dispute: false,
      active: false,
    },
  ],
  emailAccounts: {
    gmail: { status: 'not_connected' },
    outlook: { status: 'not_connected' },
  },
  csm: { name: 'John Yu', email: 'john@implentio.com' },
  supportEmail: 'support@implentio.com',
}
