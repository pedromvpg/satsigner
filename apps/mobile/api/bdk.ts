import {
  Address,
  type AddressInfo,
  Amount,
  type AmountInterface,
  type CanonicalTx,
  Descriptor,
  type DescriptorInterface,
  DescriptorPublicKey,
  DescriptorSecretKey,
  ElectrumClient as BdkElectrumClient,
  EsploraClient as BdkEsploraClient,
  KeychainKind,
  type LocalOutput,
  Mnemonic,
  Network,
  Persister,
  type PsbtInterface,
  TxBuilder,
  Wallet
} from 'bdk-rn'

import { type Account, type Key, type Secret } from '@/types/models/Account'
import { type Output } from '@/types/models/Output'
import { type Transaction } from '@/types/models/Transaction'
import { type Utxo } from '@/types/models/Utxo'
import {
  type Backend,
  type Network as BlockchainNetwork
} from '@/types/settings/blockchain'
import {
  getExtendedKeyFromDescriptor,
  getFingerprintFromExtendedPublicKey
} from '@/utils/bip32'
import { getPrivateDescriptorFromMnemonic } from '@/utils/bip39'
import {
  getMultisigDerivationPathFromScriptVersion,
  getMultisigScriptTypeFromScriptVersion
} from '@/utils/bitcoin'
import { parseAccountAddressesDetails } from '@/utils/parse'

import ElectrumClient from './electrum'
import Esplora from './esplora'

// Re-export types for backward compatibility
export { KeychainKind, Network } from 'bdk-rn'

// Convert app network string to BDK Network enum
function toBdkNetwork(network: BlockchainNetwork | Network | string): Network {
  if (typeof network === 'number') {
    return network as Network
  }
  switch (network) {
    case 'bitcoin':
      return Network.Bitcoin
    case 'testnet':
      return Network.Testnet
    case 'signet':
      return Network.Signet
    case 'regtest':
      return Network.Regtest
    default:
      console.warn(`[BDK] Unknown network: ${network}, defaulting to Signet`)
      return Network.Signet
  }
}

// Config types for backward compatibility
type BlockchainElectrumConfig = {
  url: string
  socks5?: string
  retry?: number
  timeout?: number
  stopGap?: number
  validateDomain?: boolean
}

type BlockchainEsploraConfig = {
  baseUrl: string
  proxy?: string
  concurrency?: number
  stopGap?: number
  timeout?: number
}

type WalletData = {
  fingerprint: string
  derivationPath: string
  externalDescriptor: string
  internalDescriptor: string
  wallet: Wallet
  keyFingerprints?: string[] // Optional for multisig accounts
}

async function getWalletData(
  account: Account,
  networkInput: BlockchainNetwork | Network | string
): Promise<WalletData | undefined> {
  const network = toBdkNetwork(networkInput)
  switch (account.policyType) {
    case 'singlesig': {
      if (account.keys.length !== 1)
        throw new Error('Invalid key count for singlesig')

      const key = account.keys[0]

      if (
        key.creationType === 'generateMnemonic' ||
        key.creationType === 'importMnemonic'
      ) {
        if (
          typeof key.secret === 'string' ||
          !key.secret.mnemonic ||
          !key.scriptVersion
        )
          throw new Error('Invalid secret')

        const walletData = await getWalletDataFromMnemonic(
          key.secret.mnemonic,
          key.scriptVersion,
          key.secret.passphrase,
          network
        )

        return walletData
      } else if (key.creationType === 'importDescriptor') {
        // TODO
      }
      break
    }
    case 'multisig': {
      // Get script version from the first key (all keys should have the same script version)
      const scriptVersion = account.keys[0]?.scriptVersion || 'P2WSH'
      const multisigScriptType =
        getMultisigScriptTypeFromScriptVersion(scriptVersion)

      // Extract key data with proper derivation paths and fingerprints
      const keyData = await Promise.all(
        account.keys.map(async (key, keyIndex) => {
          let extendedPublicKey = ''
          let fingerprint = ''

          if (typeof key.secret === 'object') {
            // Get fingerprint from secret or key
            fingerprint =
              (typeof key.secret === 'object' && key.secret.fingerprint) ||
              key.fingerprint ||
              ''

            // Get extended public key from various sources
            if (key.secret.extendedPublicKey) {
              extendedPublicKey = key.secret.extendedPublicKey
            } else if (key.secret.externalDescriptor) {
              try {
                const extractedKey = getExtendedKeyFromDescriptor(
                  key.secret.externalDescriptor
                )
                if (extractedKey) {
                  extendedPublicKey = extractedKey
                }
              } catch {
                // Failed to extract extended public key
              }
            }
          }

          if (!fingerprint && extendedPublicKey) {
            fingerprint = getFingerprintFromExtendedPublicKey(extendedPublicKey)
          }

          return { fingerprint, extendedPublicKey, index: keyIndex }
        })
      )

      // Filter out keys that don't have both fingerprint and extended public key
      const validKeyData = keyData.filter(
        (
          kd
        ): kd is {
          fingerprint: string
          extendedPublicKey: string
          index: number
        } =>
          kd !== null &&
          kd.fingerprint !== undefined &&
          kd.extendedPublicKey !== undefined
      )

      if (validKeyData.length !== account.keys.length) {
        throw new Error(
          `Failed to extract extended public keys from all keys (${validKeyData.length}/${account.keys.length})`
        )
      }

      // Check for duplicate fingerprints (same seed used for multiple keys)
      const fingerprints = validKeyData.map((kd) => kd.fingerprint)
      const uniqueFingerprints = [...new Set(fingerprints)]
      if (uniqueFingerprints.length !== fingerprints.length) {
        throw new Error(
          'Multisig wallets require unique keys. Using the same seed for multiple keys is not allowed. Each key must be derived from a different seed.'
        )
      }

      // Check for duplicate extended public keys
      const extendedPublicKeys = validKeyData.map((kd) => kd.extendedPublicKey)
      const uniqueExtendedPublicKeys = [...new Set(extendedPublicKeys)]
      if (uniqueExtendedPublicKeys.length !== extendedPublicKeys.length) {
        throw new Error(
          'Multisig wallets require unique keys. Using the same extended public key for multiple keys is not allowed.'
        )
      }

      // Get the policy-based derivation path according to the account type
      // Use the original scriptVersion for derivation path, not the mapped multisig script type
      const policyDerivationPath = getMultisigDerivationPathFromScriptVersion(
        scriptVersion, // Use original scriptVersion instead of multisigScriptType
        network as BlockchainNetwork
      )

      // Remove leading 'm' or 'M' from derivationPath if present
      const cleanPolicyPath = policyDerivationPath.replace(/^m\/?/i, '')

      // Sort keys by extended public key to ensure consistent ordering with other Bitcoin wallets
      const sortedKeyData = validKeyData.sort((a, b) =>
        a.extendedPublicKey.localeCompare(b.extendedPublicKey)
      )

      // Build key section with policy-based derivation paths and fingerprints
      const keySection = sortedKeyData
        .map(({ fingerprint, extendedPublicKey }) => {
          // Format: [FINGERPRINT/POLICY_DERIVATION_PATH]XPUB/<0;1>/*
          return `[${fingerprint}/${cleanPolicyPath}]${extendedPublicKey}/<0;1>/*`
        })
        .join(',')

      // Create descriptor based on script type using sortedmulti
      let finalDescriptor = ''
      switch (multisigScriptType) {
        case 'P2SH':
          finalDescriptor = `sh(sortedmulti(${account.keysRequired},${keySection}))`
          break
        case 'P2SH-P2WSH':
          finalDescriptor = `sh(wsh(sortedmulti(${account.keysRequired},${keySection})))`
          break
        case 'P2WSH':
          finalDescriptor = `wsh(sortedmulti(${account.keysRequired},${keySection}))`
          break
        case 'P2TR':
          finalDescriptor = `tr(sortedmulti(${account.keysRequired},${keySection}))`
          break
        default:
          finalDescriptor = `wsh(sortedmulti(${account.keysRequired},${keySection}))`
      }

      // Since BDK doesn't support multipath descriptors directly, we need to create separate descriptors
      // for external (0/*) and internal (1/*) addresses
      const externalDescriptor = finalDescriptor.replace(/<0;1>/g, '0')
      const internalDescriptor = finalDescriptor.replace(/<0;1>/g, '1')

      const externalDesc = new Descriptor(externalDescriptor, network)
      const internalDesc = new Descriptor(internalDescriptor, network)

      const parsedDescriptor = parseDescriptor(externalDesc)

      const wallet = await getWalletFromDescriptor(
        externalDesc,
        internalDesc,
        network
      )

      // Extract individual key fingerprints
      const keyFingerprints = validKeyData.map((kd) => kd.fingerprint)

      return {
        fingerprint: parsedDescriptor.fingerprint,
        derivationPath: parsedDescriptor.derivationPath,
        externalDescriptor: finalDescriptor, // Store the original multipath descriptor
        internalDescriptor: '',
        wallet,
        keyFingerprints
      }
    }
    case 'watchonly': {
      if (account.keys.length !== 1)
        throw new Error('Invalid key count for singlesig')

      const key = account.keys[0]

      if (key.creationType === 'importDescriptor') {
        if (typeof key.secret === 'string' || !key.secret.externalDescriptor)
          throw new Error('Invalid secret')

        const externalDescriptor = new Descriptor(
          key.secret.externalDescriptor,
          network
        )
        const internalDescriptor = key.secret.internalDescriptor
          ? new Descriptor(key.secret.internalDescriptor, network)
          : null

        const parsedDescriptor = parseDescriptor(externalDescriptor)
        const wallet = await getWalletFromDescriptor(
          externalDescriptor,
          internalDescriptor,
          network
        )

        return {
          fingerprint: parsedDescriptor.fingerprint,
          derivationPath: parsedDescriptor.derivationPath,
          externalDescriptor: externalDescriptor.toString(),
          internalDescriptor: internalDescriptor
            ? internalDescriptor.toString()
            : '',
          wallet
        }
      } else if (key.creationType === 'importExtendedPub') {
        if (
          !key.scriptVersion ||
          typeof key.secret === 'string' ||
          !key.secret.fingerprint ||
          !key.secret.extendedPublicKey
        )
          throw new Error('Invalid account information')

        const extendedPublicKey = DescriptorPublicKey.fromString(
          key.secret.extendedPublicKey
        )

        let externalDescriptor: DescriptorInterface
        let internalDescriptor: DescriptorInterface

        switch (key.scriptVersion) {
          case 'P2PKH':
            externalDescriptor = Descriptor.newBip44Public(
              extendedPublicKey,
              key.secret.fingerprint,
              KeychainKind.External,
              network
            )
            internalDescriptor = Descriptor.newBip44Public(
              extendedPublicKey,
              key.secret.fingerprint,
              KeychainKind.Internal,
              network
            )
            break
          case 'P2SH-P2WPKH':
            externalDescriptor = Descriptor.newBip49Public(
              extendedPublicKey,
              key.secret.fingerprint,
              KeychainKind.External,
              network
            )
            internalDescriptor = Descriptor.newBip49Public(
              extendedPublicKey,
              key.secret.fingerprint,
              KeychainKind.Internal,
              network
            )
            break
          case 'P2WPKH':
            externalDescriptor = Descriptor.newBip84Public(
              extendedPublicKey,
              key.secret.fingerprint,
              KeychainKind.External,
              network
            )
            internalDescriptor = Descriptor.newBip84Public(
              extendedPublicKey,
              key.secret.fingerprint,
              KeychainKind.Internal,
              network
            )
            break
          case 'P2TR':
            externalDescriptor = Descriptor.newBip86Public(
              extendedPublicKey,
              key.secret.fingerprint,
              KeychainKind.External,
              network
            )
            internalDescriptor = Descriptor.newBip86Public(
              extendedPublicKey,
              key.secret.fingerprint,
              KeychainKind.Internal,
              network
            )
            break
          case 'P2WSH':
          case 'P2SH-P2WSH':
          case 'P2SH':
            // For multisig script types, we need to create descriptors manually
            throw new Error(
              `Manual descriptor creation required for ${key.scriptVersion}`
            )
          default:
            externalDescriptor = Descriptor.newBip84Public(
              extendedPublicKey,
              key.secret.fingerprint,
              KeychainKind.External,
              network
            )
            internalDescriptor = Descriptor.newBip84Public(
              extendedPublicKey,
              key.secret.fingerprint,
              KeychainKind.Internal,
              network
            )
            break
        }

        const parsedDescriptor = parseDescriptor(
          externalDescriptor as Descriptor
        )
        const wallet = await getWalletFromDescriptor(
          externalDescriptor as Descriptor,
          internalDescriptor as Descriptor,
          network
        )

        return {
          fingerprint: parsedDescriptor.fingerprint,
          derivationPath: parsedDescriptor.derivationPath,
          externalDescriptor: externalDescriptor.toString(),
          internalDescriptor: internalDescriptor.toString(),
          wallet
        }
      } else if (key.creationType === 'importAddress') {
        // BDK does not support address descriptor
      }

      break
    }
  }
}

function getDescriptorObjectMultiSig(
  mnemonic: NonNullable<Secret['mnemonic']>,
  scriptVersion: NonNullable<Key['scriptVersion']>,
  kind: KeychainKind,
  passphrase: Secret['passphrase'],
  network: Network
): DescriptorInterface {
  const parsedMnemonic = Mnemonic.fromString(mnemonic)
  const descriptorSecretKey = new DescriptorSecretKey(
    network,
    parsedMnemonic,
    passphrase || undefined
  )
  const baseDescriptor = Descriptor.newBip84(descriptorSecretKey, kind, network)
  const baseString = baseDescriptor.toString()
  const keyPart = baseString.replace(/^wpkh\(/, '').replace(/\)$/, '')

  let descriptorString = ''

  switch (scriptVersion) {
    case 'P2WSH':
      descriptorString = `wsh(${keyPart})`
      break
    case 'P2SH-P2WSH':
      descriptorString = `sh(wsh(${keyPart}))`
      break
    case 'P2SH':
      descriptorString = `sh(${keyPart})`
      break
    default:
      throw new Error(`Unsupported script version: ${scriptVersion}`)
  }

  const descriptor = new Descriptor(descriptorString, network)
  return descriptor
}

async function getWalletDataFromMnemonic(
  mnemonic: NonNullable<Secret['mnemonic']>,
  scriptVersion: NonNullable<Key['scriptVersion']>,
  passphrase: Secret['passphrase'],
  network: Network
) {
  console.log('[BDK] getWalletDataFromMnemonic started', { scriptVersion, network })

  try {
    console.log('[BDK] Creating external descriptor...')
    const externalDescriptor = getDescriptorObject(
      mnemonic,
      scriptVersion,
      KeychainKind.External,
      passphrase,
      network
    )
    console.log('[BDK] External descriptor created:', externalDescriptor.toString().slice(0, 50) + '...')

    console.log('[BDK] Creating internal descriptor...')
    const internalDescriptor = getDescriptorObject(
      mnemonic,
      scriptVersion,
      KeychainKind.Internal,
      passphrase,
      network
    )
    console.log('[BDK] Internal descriptor created:', internalDescriptor.toString().slice(0, 50) + '...')

    const parsedDescriptor = parseDescriptor(externalDescriptor as Descriptor)
    console.log('[BDK] Parsed descriptor:', parsedDescriptor)

    console.log('[BDK] Creating wallet from descriptor...')
    const wallet = await getWalletFromDescriptor(
      externalDescriptor as Descriptor,
      internalDescriptor as Descriptor,
      network
    )
    console.log('[BDK] Wallet created successfully')

    return {
      fingerprint: parsedDescriptor.fingerprint,
      derivationPath: parsedDescriptor.derivationPath,
      externalDescriptor: externalDescriptor.toString(),
      internalDescriptor: internalDescriptor.toString(),
      wallet
    }
  } catch (error) {
    console.error('[BDK] Error in getWalletDataFromMnemonic:', error)
    throw error
  }
}

function getDescriptorObject(
  mnemonic: NonNullable<Secret['mnemonic']>,
  scriptVersion: NonNullable<Key['scriptVersion']>,
  kind: KeychainKind,
  passphrase: Secret['passphrase'],
  network: Network
): DescriptorInterface {
  console.log('[BDK] getDescriptorObject called', { scriptVersion, kind, network, networkType: typeof network })

  // TODO: inspect if extra multisig is really needed, since the
  // getPrivateDescriptorFromMnemonic should work (in theory) for both
  // scenarios.
  if (
    scriptVersion === 'P2SH' ||
    scriptVersion === 'P2SH-P2WSH' ||
    scriptVersion === 'P2WSH'
  ) {
    console.log('[BDK] Using multisig descriptor')
    return getDescriptorObjectMultiSig(
      mnemonic,
      scriptVersion,
      kind,
      passphrase,
      network
    )
  }

  console.log('[BDK] Getting private descriptor from mnemonic...')
  const descriptor = getPrivateDescriptorFromMnemonic(
    mnemonic,
    scriptVersion,
    kind,
    passphrase,
    network
  )
  console.log('[BDK] Private descriptor string:', descriptor.slice(0, 50) + '...')

  console.log('[BDK] Creating Descriptor object...')
  const descriptorObject = new Descriptor(descriptor, network)
  console.log('[BDK] Descriptor object created')
  return descriptorObject
}

// Synchronous version of parseDescriptor
function parseDescriptor(descriptor: Descriptor) {
  if (!descriptor) {
    return { fingerprint: '', derivationPath: '' }
  }
  const descriptorString = descriptor.toString()
  const match = descriptorString.match(/\[([0-9a-f]+)([0-9'/]+)\]/)
  return match
    ? { fingerprint: match[1], derivationPath: `m${match[2]}` }
    : { fingerprint: '', derivationPath: '' }
}

async function getWalletFromDescriptor(
  externalDescriptor: Descriptor | DescriptorInterface,
  internalDescriptor: Descriptor | DescriptorInterface | null | undefined,
  network: Network
) {
  const persister = Persister.newInMemory()

  // Create a dummy internal descriptor if none provided (single-descriptor wallet)
  if (!internalDescriptor) {
    return Wallet.createSingle(
      externalDescriptor as DescriptorInterface,
      network,
      persister
    )
  }

  const wallet = new Wallet(
    externalDescriptor as DescriptorInterface,
    internalDescriptor as DescriptorInterface,
    network,
    persister
  )

  return wallet
}

function getExtendedPublicKeyFromAccountKey(key: Key, network: Network) {
  if (
    typeof key.secret === 'string' ||
    !key.secret.mnemonic ||
    !key.scriptVersion
  )
    return

  const externalDescriptor = getDescriptorObject(
    key.secret.mnemonic,
    key.scriptVersion,
    KeychainKind.External,
    key.secret.passphrase,
    network
  )
  const extendedKey = getExtendedKeyFromDescriptor(externalDescriptor.toString())

  return extendedKey
}

async function syncWallet(
  wallet: Wallet,
  backend: Backend,
  blockchainConfig: BlockchainElectrumConfig | BlockchainEsploraConfig
) {
  console.log('[BDK] Starting wallet sync...')
  console.log('[BDK] Backend:', backend)
  console.log('[BDK] Config:', JSON.stringify(blockchainConfig, null, 2))

  const stopGap = BigInt(blockchainConfig.stopGap || 10)
  const batchSize = BigInt(10)
  const fetchPrevTxouts = true

  // Build full scan request from wallet
  const request = wallet.startFullScan().build()

  if (backend === 'electrum') {
    const config = blockchainConfig as BlockchainElectrumConfig
    const client = new BdkElectrumClient(config.url, config.socks5 || undefined)

    console.log('[BDK] Calling electrum fullScan()...')
    const update = client.fullScan(request, stopGap, batchSize, fetchPrevTxouts)

    console.log('[BDK] Applying update to wallet...')
    wallet.applyUpdate(update)
  } else {
    const config = blockchainConfig as BlockchainEsploraConfig
    const client = new BdkEsploraClient(
      config.baseUrl,
      config.proxy || undefined
    )
    const parallelRequests = BigInt(config.concurrency || 4)

    console.log('[BDK] Calling esplora fullScan()...')
    const update = client.fullScan(request, stopGap, parallelRequests)

    console.log('[BDK] Applying update to wallet...')
    wallet.applyUpdate(update)
  }

  console.log('[BDK] Wallet sync completed successfully')
  return true
}

// For backward compatibility - returns a client that can broadcast
function getBlockchain(
  backend: Backend,
  config: BlockchainElectrumConfig | BlockchainEsploraConfig
): BdkElectrumClient | BdkEsploraClient {
  if (backend === 'esplora') {
    const esploraConfig = config as BlockchainEsploraConfig
    return new BdkEsploraClient(
      esploraConfig.baseUrl,
      esploraConfig.proxy || undefined
    )
  }

  const electrumConfig = config as BlockchainElectrumConfig
  return new BdkElectrumClient(
    electrumConfig.url,
    electrumConfig.socks5 || undefined
  )
}

async function getWalletAddresses(
  wallet: Wallet,
  networkInput: BlockchainNetwork | Network | string,
  count = 10
): Promise<Account['addresses']> {
  const network = toBdkNetwork(networkInput)
  const addresses: Account['addresses'] = []

  for (let i = 0; i < count; i += 1) {
    const receiveAddrInfo = wallet.peekAddress(KeychainKind.External, i)
    const receiveAddr = receiveAddrInfo.address.toString()
    addresses.push({
      address: receiveAddr,
      keychain: 'external',
      transactions: [],
      utxos: [],
      index: i,
      network: network as BlockchainNetwork,
      label: '',
      summary: {
        transactions: 0,
        utxos: 0,
        balance: 0,
        satsInMempool: 0
      }
    })

    const changeAddrInfo = wallet.peekAddress(KeychainKind.Internal, i)
    const changeAddr = changeAddrInfo.address.toString()

    addresses.push({
      address: changeAddr,
      keychain: 'internal',
      transactions: [],
      utxos: [],
      index: i,
      network: network as BlockchainNetwork,
      label: '',
      summary: {
        transactions: 0,
        utxos: 0,
        balance: 0,
        satsInMempool: 0
      }
    })
  }

  return addresses
}

async function getWalletAddressesUsingStopGap(
  wallet: Wallet,
  network: Network,
  transactions: Transaction[],
  stopGap: number
): Promise<Account['addresses']> {
  const addresses: Account['addresses'] = []
  const seenAddresses: Record<string, boolean> = {}

  for (const tx of transactions) {
    for (const output of tx.vout) {
      seenAddresses[output.address] = true
    }
  }

  let lastIndexWithFunds = -1

  for (let i = 0; i < lastIndexWithFunds + stopGap; i += 1) {
    const receiveAddrInfo = wallet.peekAddress(KeychainKind.External, i)
    const receiveAddr = receiveAddrInfo.address.toString()
    addresses.push({
      address: receiveAddr,
      keychain: 'external',
      transactions: [],
      utxos: [],
      index: i,
      network: network as BlockchainNetwork,
      label: '',
      summary: {
        transactions: 0,
        utxos: 0,
        balance: 0,
        satsInMempool: 0
      }
    })

    if (seenAddresses[receiveAddr] !== undefined) {
      lastIndexWithFunds = i
    }

    const changeAddrInfo = wallet.peekAddress(KeychainKind.Internal, i)
    const changeAddr = changeAddrInfo.address.toString()

    addresses.push({
      address: changeAddr,
      keychain: 'internal',
      transactions: [],
      utxos: [],
      index: i,
      network: network as BlockchainNetwork,
      label: '',
      summary: {
        transactions: 0,
        utxos: 0,
        balance: 0,
        satsInMempool: 0
      }
    })
  }

  return addresses
}

async function getWalletOverview(
  wallet: Wallet,
  networkInput: BlockchainNetwork | Network | string,
  stopGap = 10
): Promise<Pick<Account, 'transactions' | 'utxos' | 'addresses' | 'summary'>> {
  const network = toBdkNetwork(networkInput)
  if (!wallet) {
    return {
      transactions: [],
      utxos: [],
      addresses: [],
      summary: {
        balance: 0,
        numberOfAddresses: 0,
        numberOfTransactions: 0,
        numberOfUtxos: 0,
        satsInMempool: 0
      }
    }
  }

  const balance = wallet.balance()
  const canonicalTxs = wallet.transactions()
  const localOutputs = wallet.listUnspent()

  const transactions: Transaction[] = []
  for (const canonicalTx of canonicalTxs || []) {
    const tx = await parseCanonicalTxToTransaction(
      canonicalTx,
      localOutputs,
      network,
      wallet
    )
    transactions.push(tx)
  }
  // TO DO: Try Promise.all() method instead Sequential one.

  const utxos: Utxo[] = []
  for (const localOutput of localOutputs || []) {
    const utxo = parseLocalOutputToUtxo(localOutput, canonicalTxs, network)
    utxos.push(utxo)
  }
  // TO DO: Try Promise.all() method instead Sequential one.

  let addresses = await getWalletAddressesUsingStopGap(
    wallet,
    network,
    transactions,
    stopGap
  )

  addresses = parseAccountAddressesDetails({
    transactions,
    utxos,
    addresses,
    keys: [
      {
        scriptVersion: undefined
      }
    ]
  } as Account)

  const seenAddress: Record<string, boolean> = {}
  for (const tx of transactions) {
    for (const output of tx.vout) {
      if (output.address) {
        seenAddress[output.address] = true
      }
    }
  }

  let numberOfAddresses = 0
  for (const address of addresses) {
    if (address.keychain === 'external' && seenAddress[address.address]) {
      numberOfAddresses += 1
    }
  }

  // Convert Amount to number (satoshis)
  const confirmedSats = Number(balance.confirmed.toSat())
  const trustedPendingSats = Number(balance.trustedPending.toSat())
  const untrustedPendingSats = Number(balance.untrustedPending.toSat())

  return {
    addresses,
    transactions,
    utxos,
    summary: {
      balance: confirmedSats,
      numberOfAddresses,
      numberOfTransactions: canonicalTxs.length,
      numberOfUtxos: localOutputs.length,
      satsInMempool: trustedPendingSats + untrustedPendingSats
    }
  }
}

async function parseCanonicalTxToTransaction(
  canonicalTx: CanonicalTx,
  utxos: LocalOutput[],
  network: Network,
  wallet: Wallet
): Promise<Transaction> {
  const { transaction, chainPosition } = canonicalTx
  const txid = transaction.computeTxid().toString()

  const transactionUtxos = utxos.filter(
    (utxo) => utxo.outpoint.txid.toString() === txid
  )

  let address = ''
  const utxo = transactionUtxos?.[0]
  if (utxo) address = getAddressFromLocalOutput(utxo, network)

  // Get sent and received amounts
  const { sent, received } = wallet.sentAndReceived(transaction)
  const sentSats = Number(sent.toSat())
  const receivedSats = Number(received.toSat())

  // Calculate fee
  let fee = 0
  try {
    const feeAmount = wallet.calculateFee(transaction)
    fee = Number(feeAmount.toSat())
  } catch {
    // Fee calculation may fail if inputs are not in wallet
  }

  let lockTimeEnabled = false
  const lockTime = Number(transaction.lockTime())
  const size = Number(transaction.totalSize())
  const version = Number(transaction.version())
  const vsize = Number(transaction.vsize())
  const weight = Number(transaction.weight())
  const raw = Array.from(new Uint8Array(transaction.serialize()))
  const vin: Transaction['vin'] = []
  const vout: Transaction['vout'] = []

  // Check if locktime is enabled (non-zero and at least one input has sequence < 0xffffffff)
  const inputs = transaction.input()
  lockTimeEnabled = lockTime > 0 && inputs.some((input) => Number(input.sequence) < 0xffffffff)

  for (const index in inputs) {
    const input = inputs[index]
    const script = Array.from(new Uint8Array(input.scriptSig.toBytes()))
    const witnessData = input.witness.map((w: ArrayBuffer) =>
      Array.from(new Uint8Array(w))
    )
    vin.push({
      previousOutput: {
        txid: input.previousOutput.txid.toString(),
        vout: input.previousOutput.vout
      },
      sequence: Number(input.sequence),
      scriptSig: script,
      witness: witnessData
    })
  }

  const outputs = transaction.output()
  for (const index in outputs) {
    const { value, scriptPubkey: scriptObj } = outputs[index]
    const script = Array.from(new Uint8Array(scriptObj.toBytes()))
    const addressObj = Address.fromScript(scriptObj, network)
    const outputAddress = addressObj.toString()
    vout.push({ value: Number(value.toSat()), address: outputAddress, script })
  }

  // Extract timestamp and block height from chain position
  let timestamp: Date | undefined
  let blockHeight: number | undefined

  if ('anchor' in chainPosition) {
    // Confirmed transaction
    const anchor = chainPosition.anchor as {
      confirmationBlockTime?: { blockId?: { height?: number }; confirmationTime?: number }
    }
    if (anchor.confirmationBlockTime) {
      blockHeight = anchor.confirmationBlockTime.blockId?.height
      if (anchor.confirmationBlockTime.confirmationTime) {
        timestamp = new Date(anchor.confirmationBlockTime.confirmationTime * 1000)
      }
    }
  } else if ('lastSeen' in chainPosition) {
    // Unconfirmed transaction
    const lastSeen = chainPosition.lastSeen as number | undefined
    if (lastSeen) {
      timestamp = new Date(lastSeen * 1000)
    }
  }

  return {
    id: txid,
    type: sentSats > 0 ? 'send' : 'receive',
    sent: sentSats,
    received: receivedSats,
    label: '',
    fee,
    prices: {},
    timestamp,
    blockHeight,
    address,
    size,
    vsize,
    vout,
    version,
    weight,
    lockTime,
    lockTimeEnabled,
    raw,
    vin
  }
}

function parseLocalOutputToUtxo(
  localOutput: LocalOutput,
  canonicalTxs: CanonicalTx[],
  network: Network
): Utxo {
  const addressTo = getAddressFromLocalOutput(localOutput, network)
  const transactionId = localOutput.outpoint.txid.toString()
  const canonicalTx = canonicalTxs.find(
    (tx) => tx.transaction.computeTxid().toString() === transactionId
  )

  const script = Array.from(
    new Uint8Array(localOutput.txout.scriptPubkey.toBytes())
  )

  // Extract timestamp from chain position
  let timestamp: Date | undefined
  if (canonicalTx && 'anchor' in canonicalTx.chainPosition) {
    const anchor = canonicalTx.chainPosition.anchor as {
      confirmationBlockTime?: { confirmationTime?: number }
    }
    if (anchor.confirmationBlockTime?.confirmationTime) {
      timestamp = new Date(anchor.confirmationBlockTime.confirmationTime * 1000)
    }
  }

  return {
    txid: transactionId,
    vout: localOutput.outpoint.vout,
    value: Number(localOutput.txout.value.toSat()),
    timestamp,
    label: '',
    addressTo,
    script,
    keychain: localOutput.keychain === KeychainKind.External ? 'external' : 'internal'
  }
}

function getAddressFromLocalOutput(utxo: LocalOutput, network: Network) {
  const script = utxo.txout.scriptPubkey
  const address = Address.fromScript(script, network)
  return address.toString()
}

async function getTransactionInputValues(
  tx: Transaction,
  backend: Backend,
  network: BlockchainNetwork,
  url: string
): Promise<Transaction['vin']> {
  if (!tx.vin.some((input) => input.value === undefined)) return tx.vin

  let vin: Transaction['vin'] = []

  if (backend === 'electrum') {
    const electrumClient = await ElectrumClient.initClientFromUrl(url, network)
    vin = await electrumClient.getTxInputValues(tx)
    electrumClient.close()
  }

  if (backend === 'esplora') {
    const esploraClient = new Esplora(url)
    vin = await esploraClient.getTxInputValues(tx.id)
  }

  // merge the old input object -- which may have label,
  // with the new one -- which has the value of the input.
  for (const index in vin) {
    vin[index] = {
      ...(tx.vin[index] || {}),
      ...vin[index]
    }
  }

  return vin
}

function getLastUnusedAddressFromWallet(wallet: Wallet): AddressInfo {
  const addressInfo = wallet.revealNextAddress(KeychainKind.External)
  return addressInfo
}

function getScriptPubKeyFromAddress(address: string, network: Network) {
  const recipientAddress = new Address(address, network)
  return recipientAddress.scriptPubkey()
}

function buildTransaction(
  wallet: Wallet,
  data: {
    inputs: Utxo[]
    outputs: Output[]
    fee: number
    options: {
      rbf: boolean
    }
  },
  network: Network
): PsbtInterface {
  let txBuilder = new TxBuilder()

  // Add UTXOs
  const outpoints = data.inputs.map((utxo) => ({
    txid: utxo.txid,
    vout: utxo.vout
  }))
  txBuilder = txBuilder.addUtxos(outpoints) as TxBuilder
  txBuilder = txBuilder.manuallySelectedOnly() as TxBuilder

  // Add recipients
  for (const output of data.outputs) {
    const recipient = getScriptPubKeyFromAddress(output.to, network)
    const amount = Amount.fromSat(BigInt(output.amount))
    txBuilder = txBuilder.addRecipient(recipient, amount) as TxBuilder
  }

  // Set fee
  txBuilder = txBuilder.feeAbsolute(Amount.fromSat(BigInt(data.fee))) as TxBuilder

  // Enable RBF if requested
  if (data.options.rbf) {
    txBuilder = txBuilder.enableRbf() as TxBuilder
  }

  // Finish building and return PSBT
  const psbt = txBuilder.finish(wallet)
  return psbt
}

function signTransaction(psbt: PsbtInterface, wallet: Wallet): boolean {
  const signed = wallet.sign(psbt, undefined)
  return signed
}

async function broadcastTransaction(
  psbt: PsbtInterface,
  blockchain: BdkElectrumClient | BdkEsploraClient
) {
  const transaction = psbt.extractTx()

  if (blockchain instanceof BdkElectrumClient) {
    const txid = blockchain.transactionBroadcast(transaction)
    return txid.toString()
  } else {
    blockchain.broadcast(transaction)
    return transaction.computeTxid().toString()
  }
}

// Comprehensive example of how to use multisig functions
export {
  broadcastTransaction,
  buildTransaction,
  getBlockchain,
  getDescriptorObject,
  getExtendedPublicKeyFromAccountKey,
  getLastUnusedAddressFromWallet,
  getTransactionInputValues,
  getWalletAddresses,
  getWalletData,
  getWalletFromDescriptor,
  getWalletDataFromMnemonic as getWalletFromMnemonic,
  getWalletOverview,
  parseDescriptor,
  signTransaction,
  syncWallet
}

// Type exports for backward compatibility
export type { BlockchainElectrumConfig, BlockchainEsploraConfig }
