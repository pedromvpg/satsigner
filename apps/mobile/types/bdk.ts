/**
 * BDK Compatibility Types
 *
 * These types provide backward compatibility with the app's existing code
 * while using the new bdk-rn v2.2.0-alpha.1 API.
 */

import {
  type AddressInfo as BdkAddressInfo,
  type PsbtInterface,
  type TransactionInterface
} from 'bdk-rn'

// Re-export the new AddressInfo type
export type AddressInfo = BdkAddressInfo

// Compatibility type for TransactionDetails (replaced by CanonicalTx in new API)
export type TransactionDetails = {
  txid: string
  fee: number
  sent: number
  received: number
  confirmationTime?: {
    height?: number
    timestamp?: number
  }
  transaction?: TransactionInterface
}

// Compatibility type for TxBuilderResult
// In the new API, TxBuilder.finish() returns PsbtInterface directly
// But the app expects { psbt, txDetails } structure
export type TxBuilderResult = {
  psbt: PsbtInterface | LegacyPsbt
  txDetails: TransactionDetails
}

// Legacy PSBT interface for compatibility with existing code
// that expects .base64 property
export type LegacyPsbt = {
  base64?: string
  serialize?: () => string
}

// Compatibility type for LocalUtxo (renamed to LocalOutput in new API)
export type LocalUtxo = {
  outpoint: {
    txid: string
    vout: number
  }
  txout: {
    value: number
    script: {
      toBytes: () => ArrayBuffer
    }
  }
  keychain: 'external' | 'internal'
  isSpent: boolean
}
