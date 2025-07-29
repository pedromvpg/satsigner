import { Descriptor } from 'bdk-rn'
import { type Network } from 'bdk-rn/lib/lib/enums'
import * as Clipboard from 'expo-clipboard'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { extractExtendedKeyFromDescriptor, parseDescriptor } from '@/api/bdk'
import { validateDescriptor } from '@/utils/validation'
import SSButton from '@/components/SSButton'
import SSText from '@/components/SSText'
import SSTextInput from '@/components/SSTextInput'
import SSFormLayout from '@/layouts/SSFormLayout'
import SSMainLayout from '@/layouts/SSMainLayout'
import SSVStack from '@/layouts/SSVStack'
import { t } from '@/locales'
import { useAccountBuilderStore } from '@/store/accountBuilder'
import { useBlockchainStore } from '@/store/blockchain'
import { type ImportDescriptorSearchParams } from '@/types/navigation/searchParams'

export default function ImportDescriptor() {
  const { keyIndex } = useLocalSearchParams<ImportDescriptorSearchParams>()
  const router = useRouter()
  const network = useBlockchainStore((state) => state.selectedNetwork)

  const [loading, setLoading] = useState(false)
  const [localDescriptor, setLocalDescriptor] = useState('')
  const [internalDescriptor, setInternalDescriptor] = useState('')
  const [alarm, setAlarm] = useState('')

  const [
    setKey,
    setExternalDescriptor,
    updateKeyFingerprint,
    setKeyDerivationPath,
    setExtendedPublicKey,
    setInternalExtendedPublicKey,
    clearKeyState,
    updateKeySecret,
    setFingerprint
  ] = useAccountBuilderStore(
    useShallow((state) => [
      state.setKey,
      state.setExternalDescriptor,
      state.updateKeyFingerprint,
      state.setKeyDerivationPath,
      state.setExtendedPublicKey,
      state.setInternalExtendedPublicKey,
      state.clearKeyState,
      state.updateKeySecret,
      state.setFingerprint
    ])
  )

  async function handleOnPressPaste() {
    const text = await Clipboard.getStringAsync()
    setLocalDescriptor(text)
  }

  async function handleOnPressPasteInternal() {
    const text = await Clipboard.getStringAsync()
    setInternalDescriptor(text)
  }

  async function handleOnPressConfirm() {
    setLoading(true)
    setAlarm('')
    try {
      if (!validateDescriptor(localDescriptor)) {
        setAlarm(t('watchonly.importDescriptor.invalid'))
        setLoading(false)
        return
      }
      const descriptor = await new Descriptor().create(
        localDescriptor,
        network as Network
      )
      const { fingerprint, derivationPath } = await parseDescriptor(descriptor)
      const extendedKey = await extractExtendedKeyFromDescriptor(descriptor)

      setExternalDescriptor(localDescriptor)
      setExtendedPublicKey(extendedKey)
      setFingerprint(fingerprint)
      setKeyDerivationPath(Number(keyIndex), derivationPath)
      setKey(Number(keyIndex))
      updateKeyFingerprint(Number(keyIndex), fingerprint)
      setKeyDerivationPath(Number(keyIndex), derivationPath)
      updateKeySecret(Number(keyIndex), {
        extendedPublicKey: extendedKey,
        fingerprint,
        derivationPath
      })
      clearKeyState()

      // Process internal descriptor if provided
      if (internalDescriptor) {
        const internalDesc = await new Descriptor().create(
          internalDescriptor,
          network as Network
        )
        const internalExtendedKey =
          await extractExtendedKeyFromDescriptor(internalDesc)
        setInternalExtendedPublicKey(internalExtendedKey)
      }

      setLoading(false)
      router.dismiss(1)
    } catch (e) {
      setAlarm(e instanceof Error ? e.message : t('watchonly.importDescriptor.invalid'))
      setLoading(false)
    }
  }

  return (
    <SSMainLayout>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <SSText uppercase>{t('account.import.descriptor')}</SSText>
          )
        }}
      />
      <ScrollView>
        <SSVStack justifyBetween>
          <SSFormLayout>
            <SSFormLayout.Item>
              <SSFormLayout.Label label={t('common.descriptor')} />
              <SSTextInput
                align="left"
                style={{
                  height: 150,
                  verticalAlign: 'top',
                  paddingVertical: 16
                }}
                multiline
                numberOfLines={5}
                value={localDescriptor}
                onChangeText={setLocalDescriptor}
              />
            </SSFormLayout.Item>
            <SSButton label={t('common.paste')} onPress={handleOnPressPaste} />
            <SSFormLayout.Item>
              <SSFormLayout.Label
                label={t('watchonly.importDescriptor.internal')}
              />
              <SSTextInput
                align="left"
                style={{
                  height: 100,
                  verticalAlign: 'top',
                  paddingVertical: 16
                }}
                multiline
                numberOfLines={3}
                value={internalDescriptor}
                onChangeText={setInternalDescriptor}
                placeholder={t(
                  'watchonly.importDescriptor.internalPlaceholder'
                )}
              />
            </SSFormLayout.Item>
            <SSButton
              label={t('common.paste')}
              onPress={handleOnPressPasteInternal}
            />
          </SSFormLayout>
          <SSButton label={t('camera.scanQRCode')} onPress={() => {}} />
          <SSButton label={t('watchonly.read.nfc')} disabled />
          {alarm ? (
            <SSText style={{ color: 'red', textAlign: 'center' }}>
              {alarm}
            </SSText>
          ) : null}
          <SSButton
            variant="outline"
            label={t('account.import.fromOtherWallet')}
            onPress={() =>
              router.push(
                `/account/add/import/descriptor/${keyIndex}/fromAccount`
              )
            }
          />
          <SSButton
            label={t('common.confirm')}
            variant="secondary"
            loading={loading}
            onPress={handleOnPressConfirm}
          />
          <SSButton
            label={t('common.cancel')}
            variant="ghost"
            onPress={() => router.back()}
          />
        </SSVStack>
      </ScrollView>
    </SSMainLayout>
  )
}
