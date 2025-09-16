export type NostrMessage = {
  id: string
  content: string | Record<string, unknown>
  created_at: number
  decryptedContent?: string
  isSender?: boolean
  pubkey?: string
}

export type NostrDM = {
  id: string
  author: string
  created_at: number
  description: string
  event: string
  label: number
  content: {
    description: string
    created_at: number
    pubkey?: string
  }
}

export type NostrAccount = {
  autoSync: boolean
  commonNpub: string
  commonNsec: string
  deviceNpub?: string
  deviceNsec?: string
  dms: NostrDM[]
  lastBackupFingerprint?: string
  lastUpdated: Date
  relays: string[]
  syncStart: Date
  trustedMemberDevices: string[]
}
