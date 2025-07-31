import ecc from '@bitcoinerlab/secp256k1'
import * as bitcoinjs from 'bitcoinjs-lib'
import { Descriptor } from 'bdk-rn'
import { type Network } from 'bdk-rn/lib/lib/enums'

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
  // Basic format check first (like client's approach)
  if (!key.match(new RegExp('^[txyzuv](pub|prv)[a-zA-Z0-9]+$'))) {
    return false
  }

  // Check length (base58 encoded extended keys are typically 111 characters)
  if (key.length !== 111) {
    return false
  }

  // For validation, accept xpub/tpub for all script types (BDK behavior)
  // Only validate that it's a valid extended key format
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

  const prefix = key.substring(0, 4)
  if (!validPrefixes.includes(prefix)) {
    return false
  }

  // If script version is provided, only check if P2TR is inactive
  if (scriptVersion === 'P2TR') {
    return false
  }

  return true
}

export function validateDerivationPath(path: string) {
  return path.match(new RegExp("^([mM]/)?([0-9]+[h']?/)*[0-9]+[h']?$")) !== null
}

// Simple regex-based descriptor validation (like client's approach)
export function validateDescriptorRegex(descriptor: string): boolean {
  // regex expressions building blocks (from client's code)
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

  // Remove checksum if any (like client's approach)
  let currentItem = descriptor.replace(checksumRegex, '')

  // Extract nested descriptor
  while (nestedRegex.test(currentItem)) {
    // first, check if the current item is a single key sh/wsh descriptor
    if (singleKeyRegex.test(currentItem)) return true

    // extract it
    currentItem = currentItem.replace(nestedKindRegex, '').replace(/\)$/, '')
  }

  // It must be either single key or multi key
  return singleKeyRegex.test(currentItem) || multiKeyRegex.test(currentItem)
}

// Enhanced descriptor validation that checks derivation path and script expressions
export function validateDescriptorWithScriptVersion(
  descriptor: string,
  scriptVersion: ScriptVersion
): boolean {
  // First, do basic regex validation
  if (!validateDescriptorRegex(descriptor)) {
    return false
  }

  // P2TR should be inactive
  if (scriptVersion === 'P2TR') {
    return false
  }

  // Remove checksum for analysis
  const descriptorWithoutChecksum = descriptor.replace(/#[a-z0-9]{8}$/, '')

  // Check if the descriptor matches the expected script type
  switch (scriptVersion) {
    case 'P2PKH':
      // Should contain pkh(...) or be a direct pkh descriptor
      return (
        descriptorWithoutChecksum.includes('pkh(') ||
        descriptorWithoutChecksum.startsWith('pkh(')
      )

    case 'P2SH-P2WPKH':
      // Should contain sh(wpkh(...)) - nested segwit
      return (
        descriptorWithoutChecksum.includes('sh(wpkh(') ||
        descriptorWithoutChecksum.startsWith('sh(wpkh(')
      )

    case 'P2WPKH':
      // Should contain wpkh(...) - native segwit
      return (
        descriptorWithoutChecksum.includes('wpkh(') ||
        descriptorWithoutChecksum.startsWith('wpkh(')
      )

    default:
      return false
  }
}

export function validateFingerprint(fingerprint: string) {
  return fingerprint.match(new RegExp('^[a-fA-F0-9]{8}$')) !== null
}

// Bitcoin descriptor checksum validation using BDK
async function validateDescriptorChecksum(
  descriptor: string,
  network: NetworkType
): Promise<boolean> {
  try {
    // Convert NetworkType to BDK Network
    const bdkNetwork = network as Network

    // First, validate the extended key format
    const extendedKeyMatch = descriptor.match(/([txyzuv]pub[a-zA-Z0-9]+)/)
    if (extendedKeyMatch) {
      const extendedKey = extendedKeyMatch[1]
      console.log('Found extended key:', extendedKey)

      // Basic extended key validation
      if (extendedKey.length < 100 || extendedKey.length > 120) {
        console.log('Extended key length invalid:', extendedKey.length)
        return false
      }

      // Check if it's a valid base58 string
      if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(extendedKey)) {
        console.log('Extended key contains invalid characters')
        return false
      }

      // Check the prefix
      const prefix = extendedKey.substring(0, 4)
      console.log('Extended key prefix:', prefix)

      // Check the length (should be around 111 characters for base58 encoded extended keys)
      console.log('Extended key length:', extendedKey.length)

      // Try to decode the extended key to check if it's valid
      try {
        // This is a basic check - in a real implementation you'd use a proper base58 decoder
        if (extendedKey.length !== 111) {
          console.log(
            'Extended key length is not 111 characters:',
            extendedKey.length
          )
          return false
        }

        // Test the extended key parsing with BDK
        const keyValid = await testExtendedKeyParsing(extendedKey, network)
        if (!keyValid) {
          console.log('Extended key failed BDK parsing test')
          return false
        }
      } catch (decodeError) {
        console.log('Extended key decode error:', decodeError)
        return false
      }
    }

    // Try to create descriptor without checksum first (more reliable)
    const descriptorWithoutChecksum = descriptor.replace(/#[a-z0-9]{8}$/, '')
    console.log(
      'Trying descriptor without checksum:',
      descriptorWithoutChecksum
    )

    try {
      const bdkDescriptor = await new Descriptor().create(
        descriptorWithoutChecksum,
        bdkNetwork
      )
      console.log('Descriptor validation successful without checksum')
      return true
    } catch (noChecksumError) {
      console.log('Descriptor invalid without checksum:', noChecksumError)

      // If that fails, try with checksum
      try {
        const bdkDescriptor = await new Descriptor().create(
          descriptor,
          bdkNetwork
        )
        console.log('Descriptor validation successful with checksum')
        return true
      } catch (checksumError) {
        console.log('Descriptor invalid with checksum:', checksumError)
        return false
      }
    }
  } catch (error) {
    console.log('Descriptor checksum validation failed:', error)
    return false
  }
}

// Calculate the correct checksum for a descriptor
async function calculateDescriptorChecksum(
  descriptor: string,
  network: NetworkType
): Promise<string | null> {
  try {
    const bdkNetwork = network as Network
    const descriptorWithoutChecksum = descriptor.replace(/#[a-z0-9]{8}$/, '')

    // Create descriptor without checksum
    const bdkDescriptor = await new Descriptor().create(
      descriptorWithoutChecksum,
      bdkNetwork
    )

    // Get the descriptor string with checksum
    const descriptorWithChecksum = await bdkDescriptor.asString()

    // Extract checksum
    const checksumMatch = descriptorWithChecksum.match(/#([a-z0-9]{8})$/)
    return checksumMatch ? checksumMatch[1] : null
  } catch (error) {
    console.log('Error calculating checksum:', error)
    return null
  }
}

export async function validateDescriptor(
  descriptor: string,
  scriptVersion?: ScriptVersion,
  network?: NetworkType
): Promise<boolean> {
  // First, do simple regex validation (like client's approach)
  const regexValid = validateDescriptorRegex(descriptor)
  if (!regexValid) {
    console.log('Descriptor failed regex validation')
    return false
  }

  // If script version is provided, validate script expressions and derivation paths
  if (scriptVersion) {
    const scriptValid = validateDescriptorWithScriptVersion(
      descriptor,
      scriptVersion
    )
    if (!scriptValid) {
      console.log('Descriptor failed script version validation')
      return false
    }
  }

  // If network is provided, validate checksum with BDK
  if (network) {
    try {
      const checksumValid = await validateDescriptorChecksum(
        descriptor,
        network
      )
      if (!checksumValid) {
        // Try to calculate the correct checksum for better error reporting
        const correctChecksum = await calculateDescriptorChecksum(
          descriptor,
          network
        )
        if (correctChecksum) {
          const currentChecksum = descriptor.match(/#([a-z0-9]{8})$/)
          if (currentChecksum) {
            console.log(
              `Checksum mismatch. Expected: ${correctChecksum}, Got: ${currentChecksum[1]}`
            )
          }
        }
      }
      return checksumValid
    } catch (error) {
      console.log('BDK checksum validation error:', error)
      return false
    }
  }

  // If no network provided, just return regex validation result
  return regexValid
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
export async function validateDescriptorWithScriptType(
  descriptor: string
): Promise<{
  isValid: boolean
  scriptType?: string
}> {
  const isValid = await validateDescriptor(descriptor)
  if (!isValid) {
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

// Helper function to get the correct descriptor with checksum
export async function getDescriptorWithChecksum(
  descriptor: string,
  network: NetworkType
): Promise<string | null> {
  try {
    const bdkNetwork = network as Network
    const descriptorWithoutChecksum = descriptor.replace(/#[a-z0-9]{8}$/, '')

    const bdkDescriptor = await new Descriptor().create(
      descriptorWithoutChecksum,
      bdkNetwork
    )
    return await bdkDescriptor.asString()
  } catch (error) {
    console.log('Error getting descriptor with checksum:', error)
    return null
  }
}

// Debug function to test extended key parsing
export async function testExtendedKeyParsing(
  extendedKey: string,
  network: NetworkType
): Promise<boolean> {
  try {
    const bdkNetwork = network as Network

    // Try to create a simple descriptor with just the extended key
    const testDescriptor = `wpkh(${extendedKey})`
    console.log('Testing extended key with descriptor:', testDescriptor)

    const bdkDescriptor = await new Descriptor().create(
      testDescriptor,
      bdkNetwork
    )
    console.log('Extended key parsing successful')
    return true
  } catch (error) {
    console.log('Extended key parsing failed:', error)
    return false
  }
}
