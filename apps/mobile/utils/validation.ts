import ecc from '@bitcoinerlab/secp256k1'
import * as bitcoinjs from 'bitcoinjs-lib'

bitcoinjs.initEccLib(ecc)

// Network and script version mapping based on the provided rules
export type NetworkType = 'bitcoin' | 'testnet' | 'signet'
export type ScriptVersion = 'P2PKH' | 'P2SH-P2WPKH' | 'P2WPKH' | 'P2TR'

// Extended key prefixes by script version and network
const EXTENDED_KEY_PREFIXES: Record<
  ScriptVersion,
  Record<NetworkType, readonly string[]>
> = {
  P2PKH: {
    bitcoin: ['xpub', 'xprv'] as const,
    testnet: ['tpub', 'tprv'] as const,
    signet: ['tpub', 'tprv'] as const
  },
  'P2SH-P2WPKH': {
    bitcoin: ['ypub', 'yprv'] as const,
    testnet: ['upub', 'uprv'] as const,
    signet: ['upub', 'uprv'] as const
  },
  P2WPKH: {
    bitcoin: ['zpub', 'zprv'] as const,
    testnet: ['vpub', 'vprv'] as const,
    signet: ['vpub', 'vprv'] as const
  },
  P2TR: {
    bitcoin: ['vpub', 'vprv'] as const, // Placeholder - should be inactive
    testnet: ['vpub', 'vprv'] as const, // Placeholder - should be inactive
    signet: ['vpub', 'vprv'] as const // Placeholder - should be inactive
  }
}

// Address prefixes by script version and network
const ADDRESS_PREFIXES = {
  P2PKH: {
    bitcoin: ['1'],
    testnet: ['m', 'n'],
    signet: ['m', 'n']
  },
  'P2SH-P2WPKH': {
    bitcoin: ['3'],
    testnet: ['2'],
    signet: ['2']
  },
  P2WPKH: {
    bitcoin: ['bc1q'],
    testnet: ['tb1q'],
    signet: ['tb1q']
  },
  P2TR: {
    bitcoin: ['bc1p'], // Placeholder - should be inactive
    testnet: ['tb1p'], // Placeholder - should be inactive
    signet: ['tb1p'] // Placeholder - should be inactive
  }
} as const

export function validateExtendedKey(
  key: string,
  scriptVersion?: ScriptVersion,
  network?: NetworkType
) {
  // Enhanced validation for extended keys with network and script version awareness
  const prefix = key.substring(0, 4)

  // If script version and network are provided, validate against specific rules
  if (scriptVersion && network) {
    // P2TR should be inactive
    if (scriptVersion === 'P2TR') {
      return false
    }

    const validPrefixes = EXTENDED_KEY_PREFIXES[scriptVersion][network]
    if (!validPrefixes.includes(prefix)) {
      return false
    }
  } else {
    // Fallback to general validation
    const validPrefixes = [
      'xpub',
      'xprv',
      'ypub',
      'yprv',
      'zpub',
      'zprv',
      'vpub',
      'vprv',
      'tpub',
      'tprv',
      'upub',
      'uprv'
    ]
    if (!validPrefixes.includes(prefix)) {
      return false
    }
  }

  // Check length (base58 encoded extended keys are typically 111 characters)
  if (key.length < 100 || key.length > 120) {
    return false
  }

  // Basic format check
  return key.match(new RegExp('^[txyzuv](pub|prv)[a-zA-Z0-9]+$')) !== null
}

export function validateDerivationPath(path: string) {
  return path.match(new RegExp("^([mM]/)?([0-9]+[h']?/)*[0-9]+[h']?$")) !== null
}

export function validateFingerprint(fingerprint: string) {
  return fingerprint.match(new RegExp('^[a-fA-F0-9]{8}$')) !== null
}

export function validateDescriptor(
  descriptor: string,
  scriptVersion?: ScriptVersion,
  network?: NetworkType
) {
  // Enhanced regex expressions for all script types
  const kind = '(sh|wsh|pk|pkh|wpkh|combo|tr|addr|raw|rawtr)'
  const nestedKind = '(sh|wsh)'
  const multiKind = `(multi|sortedmulti)`
  const fingerprint = '[a-fA-F0-9]{8}'
  const keyDerivationPath = `\\/[0-9]+[h']?`
  const fullFingerprint = `\\[(${fingerprint})?(${keyDerivationPath})+\\]`
  const content = '[a-zA-Z0-9]+'
  const addressDerivationPath = '(\\/[0-9*])*'
  const checksum = '#[a-z0-9]{8}'
  const key = `(${fullFingerprint})?${content}${addressDerivationPath}`
  const singleKey = `^${kind}\\(${key}\\)$`
  const multiKey = `^${multiKind}\\([1-9][0-9]*,(${key},)+${key}\\)$`
  const nestedDescriptor = `^${nestedKind}\\(.+\\)$`

  // auxiliary regex to extract nested items
  const checksumRegex = new RegExp(`${checksum}$`)
  const nestedKindRegex = new RegExp(`^${nestedKind}\\(`)

  // main regex to parse the descriptor
  const singleKeyRegex = new RegExp(singleKey, 'gm')
  const multiKeyRegex = new RegExp(multiKey, 'gm')
  const nestedRegex = new RegExp(nestedDescriptor, 'gm')

  // Remove checksum if any.
  // Nested descriptor have only 1 checksum, that is why we remove it first.
  // Because we remove it, we also do not need to check it again.
  let currentItem = descriptor.replace(checksumRegex, '')

  // Extract nested descriptor.
  // Example: wsh(sh(pkh(...))) -> pkh(...)
  while (nestedRegex.test(currentItem)) {
    // first, check if the current item is a single key sh/wsh descriptor
    if (singleKeyRegex.test(currentItem)) return true

    // extract it
    currentItem = currentItem.replace(nestedKindRegex, '').replace(/\)$/, '')
  }

  // It must be either single key or multi key
  const isValid =
    singleKeyRegex.test(currentItem) || multiKeyRegex.test(currentItem)

  // If script version is P2TR, it should be inactive
  if (scriptVersion === 'P2TR') {
    return false
  }

  return isValid
}

export function validateAddress(
  address: string,
  scriptVersion?: ScriptVersion,
  network?: NetworkType
) {
  // If script version and network are provided, validate against specific rules
  if (scriptVersion && network) {
    // P2TR should be inactive
    if (scriptVersion === 'P2TR') {
      return false
    }

    const validPrefixes = ADDRESS_PREFIXES[scriptVersion][network]
    const hasValidPrefix = validPrefixes.some((prefix) =>
      address.startsWith(prefix)
    )

    if (!hasValidPrefix) {
      return false
    }
  }

  // Fallback to general validation
  const networks = [
    bitcoinjs.networks.bitcoin,
    bitcoinjs.networks.testnet,
    bitcoinjs.networks.regtest
  ]
  for (const network of networks) {
    try {
      bitcoinjs.address.toOutputScript(address, network)
      return true
    } catch {
      // Continue to next network if validation fails
    }
  }
  return false
}

// Enhanced validation functions for specific script types with network awareness
export function validateP2PKHAddress(address: string, network?: NetworkType) {
  const validPrefixes = network === 'bitcoin' ? ['1'] : ['m', 'n']
  return validPrefixes.some((prefix) => address.startsWith(prefix))
}

export function validateP2SHAddress(address: string, network?: NetworkType) {
  const validPrefixes = network === 'bitcoin' ? ['3'] : ['2']
  return validPrefixes.some((prefix) => address.startsWith(prefix))
}

export function validateP2WPKHAddress(address: string, network?: NetworkType) {
  const validPrefixes = network === 'bitcoin' ? ['bc1q'] : ['tb1q']
  return validPrefixes.some((prefix) => address.startsWith(prefix))
}

export function validateP2TRAddress(address: string, network?: NetworkType) {
  // P2TR should be inactive
  return false
}

// Function to get script type from address
export function getAddressScriptType(address: string): string | null {
  if (validateP2PKHAddress(address)) return 'P2PKH'
  if (validateP2SHAddress(address)) return 'P2SH'
  if (validateP2WPKHAddress(address)) return 'P2WPKH'
  if (validateP2TRAddress(address)) return 'P2TR'
  return null
}

// Enhanced descriptor validation with script type detection
export function validateDescriptorWithScriptType(descriptor: string): {
  isValid: boolean
  scriptType?: string
} {
  if (!validateDescriptor(descriptor)) {
    return { isValid: false }
  }

  // Extract script type from descriptor
  if (descriptor.startsWith('pk(')) return { isValid: true, scriptType: 'P2PK' }
  if (descriptor.startsWith('pkh('))
    return { isValid: true, scriptType: 'P2PKH' }
  if (descriptor.startsWith('wpkh('))
    return { isValid: true, scriptType: 'P2WPKH' }
  if (descriptor.startsWith('sh(')) return { isValid: true, scriptType: 'P2SH' }
  if (descriptor.startsWith('wsh('))
    return { isValid: true, scriptType: 'P2WSH' }
  if (descriptor.startsWith('tr(')) return { isValid: true, scriptType: 'P2TR' }
  if (descriptor.startsWith('addr('))
    return { isValid: true, scriptType: 'ADDR' }
  if (
    descriptor.startsWith('multi(') ||
    descriptor.startsWith('sortedmulti(')
  ) {
    return { isValid: true, scriptType: 'MULTISIG' }
  }

  return { isValid: true, scriptType: 'UNKNOWN' }
}

// Helper function to get expected extended key prefix for a script version and network
export function getExpectedExtendedKeyPrefix(
  scriptVersion: ScriptVersion,
  network: NetworkType,
  isPrivate: boolean = false
): string[] {
  if (scriptVersion === 'P2TR') {
    return [] // P2TR should be inactive
  }

  const prefixes = EXTENDED_KEY_PREFIXES[scriptVersion][network]
  return isPrivate
    ? prefixes.filter((p) => p.includes('prv'))
    : prefixes.filter((p) => p.includes('pub'))
}

// Helper function to get expected address prefixes for a script version and network
export function getExpectedAddressPrefixes(
  scriptVersion: ScriptVersion,
  network: NetworkType
): string[] {
  if (scriptVersion === 'P2TR') {
    return [] // P2TR should be inactive
  }

  return [...ADDRESS_PREFIXES[scriptVersion][network]]
}
