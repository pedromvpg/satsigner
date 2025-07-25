import { type Network } from 'bdk-rn/lib/lib/enums'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { generateMnemonic, getFingerprint } from '@/api/bdk'
import { SSIconAdd, SSIconGreen } from '@/components/icons'
import SSButton from '@/components/SSButton'
import SSScriptVersionModal from '@/components/SSScriptVersionModal'
import SSText from '@/components/SSText'
import SSTextInput from '@/components/SSTextInput'
import SSFormLayout from '@/layouts/SSFormLayout'
import SSHStack from '@/layouts/SSHStack'
import SSVStack from '@/layouts/SSVStack'
import { t } from '@/locales'
import { useAccountBuilderStore } from '@/store/accountBuilder'
import { useBlockchainStore } from '@/store/blockchain'
import { type Key } from '@/types/models/Account'
import { formatAddress } from '@/utils/format'

type SSMultisigKeyControlProps = {
  isBlackBackground: boolean
  index: number
  keyCount: number
  keyDetails?: Key
}

function SSMultisigKeyControl({
  isBlackBackground,
  index,
  keyCount,
  keyDetails
}: SSMultisigKeyControlProps) {
  const router = useRouter()
  const [
    scriptVersion,
    setKeyName,
    setScriptVersion,
    setMnemonic,
    setFingerprint,
    setCreationType,
    setNetwork
  ] = useAccountBuilderStore(
    useShallow((state) => [
      state.scriptVersion,
      state.setKeyName,
      state.setScriptVersion,
      state.setMnemonic,
      state.setFingerprint,
      state.setCreationType,
      state.setNetwork
    ])
  )
  const network = useBlockchainStore((state) => state.selectedNetwork)

  const [isExpanded, setIsExpanded] = useState(false)
  const [localKeyName, setLocalKeyName] = useState(keyDetails?.name || '')
  const [localScriptVersion, setLocalScriptVersion] = 
    useState<NonNullable<Key['scriptVersion']>>(keyDetails?.scriptVersion || scriptVersion || 'P2WPKH')
  const [scriptVersionModalVisible, setScriptVersionModalVisible] = useState(false)
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
    }
  }

  async function handleAction(type: NonNullable<Key['creationType']>) {
    if (!localKeyName.trim()) return

    setCreationType(type)
    setKeyName(localKeyName)
    setScriptVersion(localScriptVersion)
    setNetwork(network)

    if (type === 'generateMnemonic') {
      // Navigate to policy type component instead of generating directly
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

  if (typeof keyDetails?.secret === 'string') return null

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
              color={keyDetails?.secret.extendedPublicKey ? 'white' : 'muted'}
            >
              {keyDetails?.secret.extendedPublicKey
                ? formatAddress(keyDetails.secret.extendedPublicKey, 6)
                : t('account.seed.publicKey')}
            </SSText>
          </SSVStack>
        </SSHStack>
      </TouchableOpacity>

      {isExpanded && (
        <SSVStack style={{ paddingHorizontal: 16, paddingBottom: 16 }} gap="lg">
          <SSFormLayout>
            <SSFormLayout.Item>
              <SSFormLayout.Label label={t('account.name')} />
              <SSTextInput
                value={localKeyName}
                onChangeText={setLocalKeyName}
              />
            </SSFormLayout.Item>
            <SSFormLayout.Item>
              <SSFormLayout.Label label={t('account.script')} />
              <SSButton
                label={`${t(`script.${localScriptVersion.toLocaleLowerCase()}.name`)} (${localScriptVersion})`}
                withSelect
                onPress={() => setScriptVersionModalVisible(true)}
              />
            </SSFormLayout.Item>
          </SSFormLayout>
          
          <SSVStack gap="sm">
            <SSButton
              label={t('account.generate.title')}
              variant="secondary"
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
              label={t('account.import.xpub')}
              disabled={!localKeyName.trim()}
              onPress={() => handleAction('importExtendedPub')}
            />
          </SSVStack>
        </SSVStack>
      )}

      <SSScriptVersionModal
        visible={scriptVersionModalVisible}
        scriptVersion={localScriptVersion}
        onSelect={(scriptVersion) => {
          setLocalScriptVersion(scriptVersion)
          setScriptVersionModalVisible(false)
        }}
        onCancel={() => setScriptVersionModalVisible(false)}
      />
    </View>
  )
}

export default SSMultisigKeyControl
