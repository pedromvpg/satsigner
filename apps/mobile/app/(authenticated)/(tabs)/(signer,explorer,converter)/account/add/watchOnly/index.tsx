import * as Clipboard from 'expo-clipboard'
import { router, Stack } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Animated, Keyboard, ScrollView, StyleSheet } from 'react-native'
import { toast } from 'sonner-native'
import { useShallow } from 'zustand/react/shallow'

import SSButton from '@/components/SSButton'
import SSCollapsible from '@/components/SSCollapsible'
import SSRadioButton from '@/components/SSRadioButton'
import SSScriptVersionModal from '@/components/SSScriptVersionModal'
import SSSelectModal from '@/components/SSSelectModal'
import SSText from '@/components/SSText'
import SSTextInput from '@/components/SSTextInput'
import SSUnifiedImport from '@/components/SSUnifiedImport'
import useAccountBuilderFinish from '@/hooks/useAccountBuilderFinish'
import { useNFCReader } from '@/hooks/useNFCReader'
import useSyncAccountWithAddress from '@/hooks/useSyncAccountWithAddress'
import useSyncAccountWithWallet from '@/hooks/useSyncAccountWithWallet'
import SSFormLayout from '@/layouts/SSFormLayout'
import SSMainLayout from '@/layouts/SSMainLayout'
import SSVStack from '@/layouts/SSVStack'
import { t } from '@/locales'
import { useAccountBuilderStore } from '@/store/accountBuilder'
import { useAccountsStore } from '@/store/accounts'
import { useBlockchainStore } from '@/store/blockchain'
import { Colors } from '@/styles'
import { type CreationType } from '@/types/models/Account'
import { type ImportType } from '@/components/SSUnifiedImport'
import { type NetworkType, type ScriptVersion } from '@/utils/validation'

const watchOnlyOptions: CreationType[] = [
  'importExtendedPub',
  'importDescriptor',
  'importAddress'
]

export default function WatchOnly() {
  const updateAccount = useAccountsStore((state) => state.updateAccount)
  const [
    name,
    scriptVersion,
    fingerprint,
    setCreationType,
    clearAccount,
    getAccountData,
    setFingerprint,
    setExternalDescriptor,
    setInternalDescriptor,
    setExtendedPublicKey,
    setScriptVersion,
    setKey,
    setNetwork
  ] = useAccountBuilderStore(
    useShallow((state) => [
      state.name,
      state.scriptVersion,
      state.fingerprint,
      state.setCreationType,
      state.clearAccount,
      state.getAccountData,
      state.setFingerprint,
      state.setExternalDescriptor,
      state.setInternalDescriptor,
      state.setExtendedPublicKey,
      state.setScriptVersion,
      state.setKey,
      state.setNetwork
    ])
  )
  const [network, connectionMode] = useBlockchainStore((state) => [
    state.selectedNetwork,
    state.configs[state.selectedNetwork].config.connectionMode
  ])
  const networkType = network as NetworkType
  const scriptVersionType = scriptVersion as ScriptVersion
  const { accountBuilderFinish } = useAccountBuilderFinish()
  const { syncAccountWithWallet } = useSyncAccountWithWallet()
  const { syncAccountWithAddress } = useSyncAccountWithAddress()
  const { isAvailable, isReading, readNFCTag, cancelNFCScan } = useNFCReader()

  const [selectedOption, setSelectedOption] =
    useState<CreationType>('importExtendedPub')

  const [modalOptionsVisible, setModalOptionsVisible] = useState(true)
  const [scriptVersionModalVisible, setScriptVersionModalVisible] =
    useState(false)

  const [loadingWallet, setLoadingWallet] = useState(false)

  const pulseAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (isReading) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false
          })
        ])
      )

      const scaleAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.98,
            duration: 500,
            useNativeDriver: false
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false
          })
        ])
      )

      pulseAnimation.start()
      scaleAnimation.start()
      return () => {
        pulseAnimation.stop()
        scaleAnimation.stop()
      }
    } else {
      pulseAnim.setValue(0)
      scaleAnim.setValue(1)
    }
  }, [isReading, pulseAnim, scaleAnim])

  async function confirmAccountCreation() {
    setLoadingWallet(true)
    setNetwork(network)

    const account = getAccountData()

    const data = await accountBuilderFinish(account)
    if (!data) return

    try {
      if (connectionMode === 'auto') {
        const updatedAccount =
          selectedOption !== 'importAddress'
            ? await syncAccountWithWallet(
                data.accountWithEncryptedSecret,
                data.wallet!
              )
            : await syncAccountWithAddress(data.accountWithEncryptedSecret)
        updateAccount(updatedAccount)
      }
    } catch (error) {
      const errorMessage = (error as Error).message
      if (errorMessage) {
        toast.error(errorMessage)
      }
    } finally {
      clearAccount()
      setLoadingWallet(false)
    }

    router.navigate('/')
  }

  function getImportType(): ImportType {
    switch (selectedOption) {
      case 'importDescriptor':
        return 'descriptor'
      case 'importExtendedPub':
        return 'extendedPub'
      case 'importAddress':
        return 'address'
      default:
        return 'extendedPub'
    }
  }

  async function handleImportConfirm(data: any) {
    if (selectedOption === 'importExtendedPub') {
      setExtendedPublicKey(data.xpub)
      setFingerprint(data.fingerprint)
      setKey(0)
    } else if (selectedOption === 'importDescriptor') {
      setExternalDescriptor(data.externalDescriptor)
      if (data.internalDescriptor) {
        setInternalDescriptor(data.internalDescriptor)
      }
      setKey(0)
    } else if (selectedOption === 'importAddress') {
      const addresses = data.addresses
      for (let index = 0; index < addresses.length; index += 1) {
        const address = addresses[index]
        setExternalDescriptor(`addr(${address})`)
      }
    }

    await confirmAccountCreation()
  }

  async function handleNFCRead() {
    if (isReading) {
      await cancelNFCScan()
      return
    }

    try {
      const nfcData = await readNFCTag()

      if (!nfcData) {
        toast.error(t('watchonly.read.nfcErrorNoData'))
        return
      }

      const text = nfcData
        .trim()
        .replace(/[^\S\n]+/g, '') // Remove all whitespace except newlines
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces and other invisible characters
        .replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g, '') // Remove control characters except \n
        .normalize('NFKC') // Normalize unicode characters
        .replace(/^en/, '')

      // Handle the NFC data based on selected option
      if (selectedOption === 'importDescriptor') {
        let externalDescriptor = text
        let internalDescriptor = ''
        if (text.match(/<0[,;]1>/)) {
          externalDescriptor = text
            .replace(/<0[,;]1>/, '0')
            .replace(/#[a-z0-9]+$/, '')
          internalDescriptor = text
            .replace(/<0[,;]1>/, '1')
            .replace(/#[a-z0-9]+$/, '')
        }
        if (text.includes('\n')) {
          const lines = text.split('\n')
          externalDescriptor = lines[0]
          internalDescriptor = lines[1]
        }
        await handleImportConfirm({
          externalDescriptor,
          internalDescriptor: internalDescriptor || undefined
        })
      } else if (selectedOption === 'importExtendedPub') {
        // For NFC, we need to extract both xpub and fingerprint
        // This is a simplified approach - in practice you might need more sophisticated parsing
        const lines = text.split('\n')
        const xpub = lines[0] || text
        const fingerprint = lines[1] || ''
        await handleImportConfirm({ xpub, fingerprint })
      } else if (selectedOption === 'importAddress') {
        const addresses = text.split('\n').filter((addr) => addr.trim())
        await handleImportConfirm({ addresses })
      }
    } catch (error) {
      const errorMessage = (error as Error).message
      if (errorMessage) {
        toast.error(errorMessage)
      }
    }
  }

  return (
    <SSMainLayout>
      <Stack.Screen
        options={{
          headerTitle: () => <SSText uppercase>{name}</SSText>
        }}
      />
      <ScrollView>
        <SSSelectModal
          visible={modalOptionsVisible}
          title={t('watchonly.titleModal').toUpperCase()}
          selectedText={t(`watchonly.${selectedOption}.title`)}
          selectedDescription={
            <SSCollapsible>
              <SSText color="muted" size="md">
                {t(`watchonly.${selectedOption}.text`)}
              </SSText>
            </SSCollapsible>
          }
          onSelect={() => {
            setModalOptionsVisible(false)
            setCreationType(selectedOption)
          }}
          onCancel={() => router.back()}
        >
          {watchOnlyOptions.map((type) => (
            <SSRadioButton
              key={type}
              label={t(`watchonly.${type}.label`)}
              selected={selectedOption === type}
              onPress={() => setSelectedOption(type)}
            />
          ))}
        </SSSelectModal>
        <SSScriptVersionModal
          visible={scriptVersionModalVisible}
          scriptVersion={scriptVersion}
          onCancel={() => setScriptVersionModalVisible(false)}
          onSelect={(scriptVersion) => {
            setScriptVersion(scriptVersion)
            setScriptVersionModalVisible(false)
          }}
        />
        {!modalOptionsVisible && (
          <SSVStack justifyBetween gap="lg" style={{ paddingBottom: 20 }}>
            <SSVStack gap="lg">
              {selectedOption === 'importExtendedPub' && (
                <SSVStack gap="xxs">
                  <SSFormLayout.Label
                    label={t('account.script').toUpperCase()}
                  />
                  <SSButton
                    label={`${t(
                      `script.${scriptVersion.toLocaleLowerCase()}.name`
                    )} (${scriptVersion})`}
                    withSelect
                    onPress={() => setScriptVersionModalVisible(true)}
                  />
                </SSVStack>
              )}
              <SSUnifiedImport
                importType={getImportType()}
                onConfirm={handleImportConfirm}
                loading={loadingWallet}
                allowMultiple={selectedOption === 'importAddress'}
                showScriptType={selectedOption === 'importDescriptor'}
                scriptVersion={scriptVersionType}
                network={networkType}
              />
            </SSVStack>
            <SSVStack>
              <Animated.View
                style={{
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.7]
                  }),
                  transform: [{ scale: scaleAnim }],
                  overflow: 'hidden'
                }}
              >
                <SSButton
                  label={
                    isReading
                      ? t('watchonly.read.scanning')
                      : t('watchonly.read.nfc')
                  }
                  onPress={handleNFCRead}
                  disabled={!isAvailable}
                />
              </Animated.View>
            </SSVStack>
            <SSVStack gap="sm">
              <SSButton
                label={t('common.cancel')}
                variant="ghost"
                onPress={() => setModalOptionsVisible(true)}
              />
            </SSVStack>
          </SSVStack>
        )}
      </ScrollView>
    </SSMainLayout>
  )
}

const styles = StyleSheet.create({
  invalid: {
    borderColor: Colors.error,
    borderWidth: 1,
    height: 'auto',
    paddingVertical: 10
  },
  valid: {
    height: 'auto',
    paddingVertical: 10
  }
})
