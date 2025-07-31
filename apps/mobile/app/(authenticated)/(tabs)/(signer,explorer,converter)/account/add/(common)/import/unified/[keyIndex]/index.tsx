import { Descriptor } from 'bdk-rn'
import { type Network } from 'bdk-rn/lib/lib/enums'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { extractExtendedKeyFromDescriptor, parseDescriptor } from '@/api/bdk'
import SSUnifiedImport from '@/components/SSUnifiedImport'
import SSText from '@/components/SSText'
import SSMainLayout from '@/layouts/SSMainLayout'
import { t } from '@/locales'
import { useAccountBuilderStore } from '@/store/accountBuilder'
import { useBlockchainStore } from '@/store/blockchain'
import { type ImportDescriptorSearchParams } from '@/types/navigation/searchParams'
import {
  validateDescriptor,
  type NetworkType,
  type ScriptVersion
} from '@/utils/validation'

export default function UnifiedImport() {
  const { keyIndex, importType } = useLocalSearchParams<
    ImportDescriptorSearchParams & { importType: string }
  >()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [alarm, setAlarm] = useState('')
  const network = useBlockchainStore(
    (state) => state.selectedNetwork
  ) as NetworkType
  const scriptVersion = useAccountBuilderStore(
    (state) => state.scriptVersion
  ) as ScriptVersion
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

  async function handleConfirm(data: any) {
    setLoading(true)
    setAlarm('')
    try {
      if (importType === 'descriptor') {
        if (!validateDescriptor(data.externalDescriptor)) {
          setAlarm(t('watchonly.importDescriptor.invalid'))
          setLoading(false)
          return
        }
        const descriptor = await new Descriptor().create(
          data.externalDescriptor,
          network as Network
        )
        const { fingerprint, derivationPath } =
          await parseDescriptor(descriptor)
        const extendedKey = await extractExtendedKeyFromDescriptor(descriptor)

        setExternalDescriptor(data.externalDescriptor)
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
        if (data.internalDescriptor) {
          setInternalDescriptor(data.internalDescriptor)
          const internalDesc = await new Descriptor().create(
            data.internalDescriptor,
            network as Network
          )
          const internalExtendedKey =
            await extractExtendedKeyFromDescriptor(internalDesc)
          setInternalExtendedPublicKey(internalExtendedKey)
        }
      } else if (importType === 'extendedPub') {
        setExtendedPublicKey(data.xpub)
        setFingerprint(data.fingerprint)
        setKey(Number(keyIndex))
        updateKeyFingerprint(Number(keyIndex), data.fingerprint)
        updateKeySecret(Number(keyIndex), {
          xpub: data.xpub,
          fingerprint: data.fingerprint
        })
        clearKeyState()
      } else if (importType === 'address') {
        // For address import, we create descriptor format
        const addresses = data.addresses
        for (let index = 0; index < addresses.length; index += 1) {
          const address = addresses[index]
          setExternalDescriptor(`addr(${address})`)
        }
        setKey(Number(keyIndex))
        clearKeyState()
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

  function getTitle() {
    switch (importType) {
      case 'descriptor':
        return t('account.import.descriptor')
      case 'extendedPub':
        return t('account.import.xpub')
      case 'address':
        return t('watchonly.importAddress.title')
      default:
        return t('account.import.title')
    }
  }

  return (
    <SSMainLayout>
      <Stack.Screen
        options={{
          headerTitle: () => <SSText uppercase>{getTitle()}</SSText>
        }}
      />
      <SSUnifiedImport
        importType={importType as any}
        onConfirm={handleConfirm}
        loading={loading}
        allowMultiple={importType === 'address'}
        showScriptType={importType === 'descriptor'}
        scriptVersion={scriptVersion}
        network={network}
      />
    </SSMainLayout>
  )
}
