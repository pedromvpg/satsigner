import { type Network } from 'bdk-rn/lib/lib/enums'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { generateMnemonic, getFingerprint } from '@/api/bdk'
import { SSIconAdd, SSIconGreen } from '@/components/icons'
import SSButton from '@/components/SSButton'
import SSText from '@/components/SSText'
import SSTextInput from '@/components/SSTextInput'
import SSFormLayout from '@/layouts/SSFormLayout'
import SSHStack from '@/layouts/SSHStack'
import SSVStack from '@/layouts/SSVStack'
import { t } from '@/locales'
import { useAccountBuilderStore } from '@/store/accountBuilder'
import { useAccountsStore } from '@/store/accounts'
import { useBlockchainStore } from '@/store/blockchain'
import { type Key } from '@/types/models/Account'
import { formatAddress } from '@/utils/format'

type SSMultisigKeyControlProps = {
  isBlackBackground: boolean
  index: number
  keyCount: number
  keyDetails?: Key
  isSettingsMode?: boolean
  accountId?: string
}

function SSMultisigKeyControl({
  isBlackBackground,
  index,
  keyCount,
  keyDetails,
  isSettingsMode = false,
  accountId
}: SSMultisigKeyControlProps) {
  const router = useRouter()
  const [
    scriptVersion,
    setKeyName,
    setMnemonic,
    setFingerprint,
    setCreationType,
    setNetwork
  ] = useAccountBuilderStore(
    useShallow((state) => [
      state.scriptVersion,
      state.setKeyName,
      state.setMnemonic,
      state.setFingerprint,
      state.setCreationType,
      state.setNetwork
    ])
  )
  const network = useBlockchainStore((state) => state.selectedNetwork)
  const updateKeyName = useAccountsStore((state) => state.updateKeyName)

  const [isExpanded, setIsExpanded] = useState(false)
  const [localKeyName, setLocalKeyName] = useState(keyDetails?.name || '')
  const [loading, setLoading] = useState(false)

  function getSourceLabel() {
    if (!keyDetails) {
      return t('account.selectKeySource')
    } else if (keyDetails.creationType === 'generateMnemonic') {
      return t('account.seed.newSeed', {
        name: keyDetails.scriptVersion
      })
    } else if (keyDetails.creationType === 'importMnemonic') {
      return t('account.seed.importedSeed', { name: keyDetails.scriptVersion })
    } else if (keyDetails.creationType === 'importDescriptor') {
      return t('account.seed.external')
    } else if (keyDetails.creationType === 'importExtendedPub') {
      // Show the correct label according to the selected script version
      switch (keyDetails.scriptVersion) {
        case 'P2PKH':
          return t('account.import.xpub')
        case 'P2SH-P2WPKH':
          return t('account.import.ypub')
        case 'P2WPKH':
          return t('account.import.zpub')
        case 'P2TR':
          return t('account.import.vpub')
        default:
          return t('account.import.xpub')
      }
    }
  }

  // Always use the global scriptVersion from the store
  function getImportExtendedLabel() {
    switch (scriptVersion) {
      case 'P2PKH':
        return t('account.import.xpub')
      case 'P2SH-P2WPKH':
        return t('account.import.ypub')
      case 'P2WPKH':
        return t('account.import.zpub')
      case 'P2TR':
        return t('account.import.vpub')
      default:
        return t('account.import.xpub')
    }
  }

  async function handleAction(type: NonNullable<Key['creationType']>) {
    if (!localKeyName.trim()) return

    setCreationType(type)
    setKeyName(localKeyName)
    // scriptVersion is set only in the initial policy selection and never changed here
    setNetwork(network)

    if (type === 'generateMnemonic') {
      // Navigate to each key policy type component
      router.navigate(`/account/add/multiSig/keySettings/${index}`)
    } else if (type === 'importMnemonic') {
      router.navigate(`/account/add/import/mnemonic/${index}`)
    } else if (type === 'importDescriptor') {
      router.navigate(`/account/add/import/descriptor/${index}`)
    } else if (type === 'importExtendedPub') {
      // Handle import extended public key - you may need to create this route
      router.navigate(`/account/add/import/extendedPub/${index}`)
    }
  }

  function handleCompletedKeyAction(
    action: 'dropSeed' | 'shareXpub' | 'shareDescriptor'
  ) {
    // Handle actions for completed keys
    switch (action) {
      case 'dropSeed':
        // TODO: Implement drop seed functionality
        console.log('Drop seed and keep xpub for key', index)
        break
      case 'shareXpub':
        // TODO: Implement share xpub functionality
        console.log('Share xpub for key', index)
        break
      case 'shareDescriptor':
        // TODO: Implement share descriptor functionality
        console.log('Share descriptor for key', index)
        break
    }
  }

  // Check if key is completed (has extended public key or is in settings mode)
  const isKeyCompleted = isSettingsMode
    ? true
    : keyDetails &&
      typeof keyDetails.secret === 'object' &&
      (keyDetails.secret?.extendedPublicKey || keyDetails.secret?.xpub)

  function handleKeyNameChange(newName: string) {
    setLocalKeyName(newName)

    // Save to store if in settings mode and we have an account ID
    if (isSettingsMode && accountId && newName.trim()) {
      updateKeyName(accountId, index, newName.trim())
    }
  }

  if (typeof keyDetails?.secret === 'string' && !isSettingsMode) return null

  return (
    <View
      style={[
        {
          borderColor: '#6A6A6A',
          borderTopWidth: 2,
          backgroundColor: isBlackBackground ? 'black' : '#1E1E1E'
        },
        index === keyCount - 1 && { borderBottomWidth: 2 }
      ]}
    >
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        style={{
          paddingHorizontal: 16,
          paddingBottom: 16,
          paddingTop: 16
        }}
      >
        <SSHStack justifyBetween>
          <SSHStack style={{ alignItems: 'center' }}>
            {keyDetails ? (
              <SSIconGreen width={24} height={24} />
            ) : (
              <SSIconAdd width={24} height={24} />
            )}
            <SSText color="muted" size="lg">
              {t('common.key')} {index + 1}
            </SSText>
            <SSVStack gap="none">
              <SSText>{getSourceLabel()}</SSText>
              <SSText color={keyDetails?.name ? 'white' : 'muted'}>
                {keyDetails?.name ?? t('account.seed.noLabel')}
              </SSText>
            </SSVStack>
          </SSHStack>
          <SSVStack gap="none" style={{ alignItems: 'flex-end' }}>
            <SSText color={keyDetails?.fingerprint ? 'white' : 'muted'}>
              {keyDetails?.fingerprint ?? t('account.fingerprint')}
            </SSText>
            <SSText
              color={
                keyDetails &&
                typeof keyDetails.secret === 'object' &&
                (keyDetails.secret?.xpub ||
                  keyDetails.secret?.extendedPublicKey)
                  ? 'white'
                  : 'muted'
              }
            >
              {keyDetails &&
              typeof keyDetails.secret === 'object' &&
              (keyDetails.secret?.xpub || keyDetails.secret?.extendedPublicKey)
                ? formatAddress(
                    (keyDetails.secret.xpub ||
                      keyDetails.secret.extendedPublicKey) ??
                      '',
                    6
                  )
                : t('account.seed.publicKey')}
            </SSText>
          </SSVStack>
        </SSHStack>
      </TouchableOpacity>

      {isExpanded && (
        <SSVStack style={{ paddingHorizontal: 16, paddingBottom: 16 }} gap="lg">
          {(!isKeyCompleted || isSettingsMode) && (
            <SSFormLayout>
              <SSFormLayout.Item>
                <SSFormLayout.Label label={t('account.participant.keyName')} />
                <SSTextInput
                  value={localKeyName}
                  onChangeText={handleKeyNameChange}
                />
              </SSFormLayout.Item>
            </SSFormLayout>
          )}

          <SSVStack gap="sm">
            {isKeyCompleted ? (
              <>
                <SSButton
                  label={t('account.seed.dropAndKeep')}
                  onPress={() => handleCompletedKeyAction('dropSeed')}
                  style={{
                    backgroundColor: 'black',
                    borderWidth: 1,
                    borderColor: 'white'
                  }}
                />
                <SSButton
                  label={t('account.seed.sharePub')}
                  onPress={() => handleCompletedKeyAction('shareXpub')}
                />
                <SSButton
                  label={t('account.seed.shareDescriptor')}
                  onPress={() => handleCompletedKeyAction('shareDescriptor')}
                />
              </>
            ) : (
              <>
                <SSButton
                  label={t('account.generate.newSecretSeed')}
                  disabled={!localKeyName.trim()}
                  loading={loading}
                  onPress={() => handleAction('generateMnemonic')}
                />
                <SSButton
                  label={t('account.import.title2')}
                  disabled={!localKeyName.trim()}
                  onPress={() => handleAction('importMnemonic')}
                />
                <SSButton
                  label={t('account.import.descriptor')}
                  disabled={!localKeyName.trim()}
                  onPress={() => handleAction('importDescriptor')}
                />
                <SSButton
                  label={getImportExtendedLabel()}
                  disabled={!localKeyName.trim()}
                  onPress={() => handleAction('importExtendedPub')}
                />
              </>
            )}
          </SSVStack>
        </SSVStack>
      )}
    </View>
  )
}

export default SSMultisigKeyControl
