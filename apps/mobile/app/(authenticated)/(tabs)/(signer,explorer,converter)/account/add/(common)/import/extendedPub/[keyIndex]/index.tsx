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
import SSXpubImport from '@/components/SSXpubImport'

export default function ImportExtendedPub() {
  const { keyIndex } = useLocalSearchParams<ImportDescriptorSearchParams>()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [alarm, setAlarm] = useState('')
  const {
    setKey,
    setExtendedPublicKey,
    setFingerprint,
    updateKeyFingerprint,
    updateKeySecret,
    clearKeyState
  } = useAccountBuilderStore(
    useShallow((state) => ({
      setKey: state.setKey,
      setExtendedPublicKey: state.setExtendedPublicKey,
      setFingerprint: state.setFingerprint,
      updateKeyFingerprint: state.updateKeyFingerprint,
      updateKeySecret: state.updateKeySecret,
      clearKeyState: state.clearKeyState
    }))
  )

  async function handleConfirm(xpub: string, fingerprint: string) {
    setLoading(true)
    setAlarm('')
    try {
      setFingerprint(fingerprint)
      setExtendedPublicKey(xpub)
      setKey(Number(keyIndex))
      updateKeyFingerprint(Number(keyIndex), fingerprint)
      updateKeySecret(Number(keyIndex), {
        extendedPublicKey: xpub,
        fingerprint: fingerprint
      })
      clearKeyState()
      setLoading(false)
      router.dismiss(1)
    } catch (e) {
      setAlarm('Error importing key')
      setLoading(false)
    }
  }

  return (
    <SSMainLayout>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <SSText uppercase>{t('account.import.xpub')}</SSText>
          )
        }}
      />
      <SSXpubImport onConfirm={handleConfirm} loading={loading} />
    </SSMainLayout>
  )
}
