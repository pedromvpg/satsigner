import { Descriptor } from 'bdk-rn'
import { type Network } from 'bdk-rn/lib/lib/enums'
import * as Clipboard from 'expo-clipboard'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { extractExtendedKeyFromDescriptor, parseDescriptor } from '@/api/bdk'
import SSDescriptorImport from '@/components/SSDescriptorImport'
import SSText from '@/components/SSText'
import SSTextInput from '@/components/SSTextInput'
import SSFormLayout from '@/layouts/SSFormLayout'
import SSMainLayout from '@/layouts/SSMainLayout'
import SSVStack from '@/layouts/SSVStack'
import { t } from '@/locales'
import { useAccountBuilderStore } from '@/store/accountBuilder'
import { useBlockchainStore } from '@/store/blockchain'
import { type ImportDescriptorSearchParams } from '@/types/navigation/searchParams'
import { validateDescriptor } from '@/utils/validation'

export default function ImportDescriptor() {
  const { keyIndex } = useLocalSearchParams<ImportDescriptorSearchParams>()
  const router = useRouter()
  const network = useBlockchainStore((state) => state.selectedNetwork)
  const [loading, setLoading] = useState(false)
  const [alarm, setAlarm] = useState('')
  const [
    setKey,
    setExternalDescriptor,
    setInternalExtendedPublicKey,
    setInternalDescriptor,
    setExtendedPublicKey,
    setFingerprint,
    setKeyDerivationPath,
    updateKeyFingerprint,
    updateKeySecret,
    clearKeyState
  ] = useAccountBuilderStore(
    useShallow((state) => [
      state.setKey,
      state.setExternalDescriptor,
      state.setInternalExtendedPublicKey,
      state.setInternalDescriptor,
      state.setExtendedPublicKey,
      state.setFingerprint,
      state.setKeyDerivationPath,
      state.updateKeyFingerprint,
      state.updateKeySecret,
      state.clearKeyState
    ])
  )

  async function handleConfirm(external: string, internal?: string) {
    setLoading(true)
    setAlarm('')
    try {
      if (!validateDescriptor(external)) {
        setAlarm(t('watchonly.importDescriptor.invalid'))
        setLoading(false)
        return
      }
      const descriptor = await new Descriptor().create(
        external,
        network as Network
      )
      const { fingerprint, derivationPath } = await parseDescriptor(descriptor)
      const extendedKey = await extractExtendedKeyFromDescriptor(descriptor)

      setExternalDescriptor(external)
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
      if (internal) {
        setInternalDescriptor(internal)
        const internalDesc = await new Descriptor().create(
          internal,
          network as Network
        )
        const internalExtendedKey =
          await extractExtendedKeyFromDescriptor(internalDesc)
        setInternalExtendedPublicKey(internalExtendedKey)
      }

      setLoading(false)
      router.dismiss(1)
    } catch (e) {
      setAlarm(
        e instanceof Error ? e.message : t('watchonly.importDescriptor.invalid')
      )
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
      <SSDescriptorImport onConfirm={handleConfirm} loading={loading} />
    </SSMainLayout>
  )
}
