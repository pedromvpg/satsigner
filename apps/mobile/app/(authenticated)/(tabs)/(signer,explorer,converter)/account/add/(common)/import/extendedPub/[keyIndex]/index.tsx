import * as Clipboard from 'expo-clipboard'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import SSButton from '@/components/SSButton'
import SSText from '@/components/SSText'
import SSTextInput from '@/components/SSTextInput'
import SSFormLayout from '@/layouts/SSFormLayout'
import SSMainLayout from '@/layouts/SSMainLayout'
import SSVStack from '@/layouts/SSVStack'
import { t } from '@/locales'
import { useAccountBuilderStore } from '@/store/accountBuilder'
import { type ImportDescriptorSearchParams } from '@/types/navigation/searchParams'

export default function ImportExtendedPub() {
  const { keyIndex } = useLocalSearchParams<ImportDescriptorSearchParams>()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [xpub, setXpub] = useState('')
  const [fingerprint, setFingerprint] = useState('')
  const [alarm, setAlarm] = useState('')

  const [
    setKey,
    scriptVersion,
    updateKeyFingerprint,
    updateKeySecret,
    setExtendedPublicKey,
    clearKeyState
  ] = useAccountBuilderStore(
    useShallow((state) => [
      state.setKey,
      state.scriptVersion,
      state.updateKeyFingerprint,
      state.updateKeySecret,
      state.setExtendedPublicKey,
      state.clearKeyState
    ])
  )

  function getXpubLabel() {
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

  async function handleOnPressPasteXpub() {
    const text = await Clipboard.getStringAsync()
    setXpub(text)
  }

  async function handleOnPressPasteFingerprint() {
    const text = await Clipboard.getStringAsync()
    setFingerprint(text)
  }

  function validateXpub(xpub: string) {
    return /^(xpub|ypub|zpub|vpub)[1-9A-HJ-NP-Za-km-z]{100,}$/.test(xpub.trim())
  }

  function validateFingerprint(fp: string) {
    // Basic validation: 8 hex chars
    return /^[a-fA-F0-9]{8}$/.test(fp)
  }

  async function handleOnPressConfirm() {
    setLoading(true)
    setAlarm('')
    if (!validateXpub(xpub)) {
      setAlarm('Invalid XPUB/YPUB/ZPUB/VPUB')
      setLoading(false)
      return
    }
    if (!validateFingerprint(fingerprint)) {
      setAlarm('Invalid fingerprint')
      setLoading(false)
      return
    }
    // Store xpub and fingerprint for this key index
    setKey(Number(keyIndex))
    updateKeyFingerprint(Number(keyIndex), fingerprint)
    updateKeySecret(Number(keyIndex), { extendedPublicKey: xpub })
    setExtendedPublicKey(xpub)
    clearKeyState()
    setLoading(false)
    router.dismiss(1)
  }

  return (
    <SSMainLayout>
      <Stack.Screen
        options={{
          headerTitle: () => <SSText uppercase>{getXpubLabel()}</SSText>
        }}
      />
      <ScrollView>
        <SSVStack justifyBetween>
          <SSFormLayout>
            <SSFormLayout.Item>
              <SSFormLayout.Label label={getXpubLabel()} />
              <SSTextInput
                align="left"
                style={{
                  height: 60,
                  verticalAlign: 'top',
                  paddingVertical: 16
                }}
                value={xpub}
                onChangeText={setXpub}
              />
            </SSFormLayout.Item>
            <SSButton
              label={t('common.paste')}
              onPress={handleOnPressPasteXpub}
            />
            <SSFormLayout.Item>
              <SSFormLayout.Label label="Master Fingerprint" />
              <SSTextInput
                align="left"
                style={{
                  height: 60,
                  verticalAlign: 'top',
                  paddingVertical: 16
                }}
                value={fingerprint}
                onChangeText={setFingerprint}
                placeholder="e.g. 1234abcd"
              />
            </SSFormLayout.Item>
            <SSButton
              label={t('common.paste')}
              onPress={handleOnPressPasteFingerprint}
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
