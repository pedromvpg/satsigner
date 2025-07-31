import * as Clipboard from 'expo-clipboard'
import { useState } from 'react'
import { ScrollView } from 'react-native'
import SSButton from './SSButton'
import SSText from './SSText'
import SSTextInput from './SSTextInput'
import SSFormLayout from '@/layouts/SSFormLayout'
import SSVStack from '@/layouts/SSVStack'
import { t } from '@/locales'
import {
  validateAddress,
  validateDescriptor,
  validateExtendedKey,
  validateFingerprint,
  validateDescriptorWithScriptType,
  getAddressScriptType,
  type NetworkType,
  type ScriptVersion
} from '@/utils/validation'

export type ImportType = 'descriptor' | 'extendedPub' | 'address'

export type SSUnifiedImportProps = {
  importType: ImportType
  onConfirm: (data: any) => Promise<void> | void
  loading?: boolean
  initialData?: any
  allowMultiple?: boolean
  showScriptType?: boolean
  scriptVersion?: ScriptVersion
  network?: NetworkType
}

export default function SSUnifiedImport({
  importType,
  onConfirm,
  loading = false,
  initialData = {},
  allowMultiple = true,
  showScriptType = true,
  scriptVersion,
  network
}: SSUnifiedImportProps) {
  const [externalDescriptor, setExternalDescriptor] = useState(
    initialData.externalDescriptor || ''
  )
  const [internalDescriptor, setInternalDescriptor] = useState(
    initialData.internalDescriptor || ''
  )
  const [xpub, setXpub] = useState(initialData.xpub || '')
  const [fingerprint, setFingerprint] = useState(initialData.fingerprint || '')
  const [addressInput, setAddressInput] = useState(
    Array.isArray(initialData.addresses) ? initialData.addresses.join('\n') : ''
  )
  const [alarm, setAlarm] = useState('')
  const [scriptType, setScriptType] = useState<string | null>(null)

  function handleExternalDescriptorChange(text: string) {
    setExternalDescriptor(text)
    setAlarm('')
    if (showScriptType && text) {
      const validation = validateDescriptorWithScriptType(text)
      setScriptType(validation.scriptType || null)
    }
  }

  function handleInternalDescriptorChange(text: string) {
    setInternalDescriptor(text)
    setAlarm('')
  }

  function handleXpubChange(text: string) {
    setXpub(text)
    setAlarm('')
  }

  function handleFingerprintChange(text: string) {
    setFingerprint(text)
    setAlarm('')
  }

  function handleAddressChange(text: string) {
    setAddressInput(text)
    setAlarm('')
  }

  async function handlePasteFromClipboard() {
    const text = await Clipboard.getStringAsync()
    if (!text) return

    if (importType === 'descriptor') {
      let external = text
      let internal = ''
      if (text.match(/<0[,;]1>/)) {
        external = text.replace(/<0[,;]1>/, '0').replace(/#[a-z0-9]+$/, '')
        internal = text.replace(/<0[,;]1>/, '1').replace(/#[a-z0-9]+$/, '')
      }
      if (text.includes('\n')) {
        const lines = text.split('\n')
        external = lines[0]
        internal = lines[1]
      }
      if (external) setExternalDescriptor(external)
      if (internal) setInternalDescriptor(internal)
    } else if (importType === 'extendedPub') {
      // Try to detect if it's an xpub or fingerprint
      if (validateExtendedKey(text)) {
        setXpub(text)
      } else if (validateFingerprint(text)) {
        setFingerprint(text)
      } else {
        // If it's not clearly one or the other, assume it's an xpub
        setXpub(text)
      }
    } else if (importType === 'address') {
      setAddressInput(text)
    }
  }

  async function handleConfirm() {
    if (importType === 'descriptor') {
      if (!validateDescriptor(externalDescriptor, scriptVersion, network)) {
        setAlarm(t('watchonly.importDescriptor.invalid'))
        return
      }
      if (
        internalDescriptor &&
        !validateDescriptor(internalDescriptor, scriptVersion, network)
      ) {
        setAlarm(t('watchonly.importDescriptor.invalid'))
        return
      }
      await onConfirm({
        externalDescriptor,
        internalDescriptor: internalDescriptor || undefined
      })
    } else if (importType === 'extendedPub') {
      if (!validateExtendedKey(xpub, scriptVersion, network)) {
        setAlarm('Invalid XPUB/YPUB/ZPUB/VPUB')
        return
      }
      if (!validateFingerprint(fingerprint)) {
        setAlarm('Invalid fingerprint')
        return
      }
      await onConfirm({ xpub, fingerprint })
    } else if (importType === 'address') {
      const addresses = addressInput
        .split('\n')
        .map((addr: string) => addr.trim())
        .filter((addr: string) => addr.length > 0)

      if (addresses.length === 0) {
        setAlarm(t('watchonly.importAddress.empty'))
        return
      }

      // Validate each address
      for (const address of addresses) {
        if (!validateAddress(address, scriptVersion, network)) {
          setAlarm(t('watchonly.importAddress.invalid'))
          return
        }
      }

      // If multiple addresses not allowed, only use the first one
      const finalAddresses = allowMultiple ? addresses : [addresses[0]]
      await onConfirm({ addresses: finalAddresses })
    }
  }

  function renderDescriptorInputs() {
    return (
      <>
        <SSFormLayout.Item>
          <SSFormLayout.Label label={t('common.descriptor')} />
          <SSTextInput
            align="left"
            style={{ height: 150, verticalAlign: 'top', paddingVertical: 16 }}
            multiline
            numberOfLines={5}
            value={externalDescriptor}
            onChangeText={handleExternalDescriptorChange}
          />
        </SSFormLayout.Item>
        <SSFormLayout.Item>
          <SSFormLayout.Label
            label={t('watchonly.importDescriptor.internal')}
          />
          <SSTextInput
            align="left"
            style={{ height: 100, verticalAlign: 'top', paddingVertical: 16 }}
            multiline
            numberOfLines={3}
            value={internalDescriptor}
            onChangeText={handleInternalDescriptorChange}
            placeholder={t('watchonly.importDescriptor.internalPlaceholder')}
          />
        </SSFormLayout.Item>
        {showScriptType && scriptType && (
          <SSFormLayout.Item>
            <SSFormLayout.Label label="Script Type" />
            <SSText color="muted">{scriptType}</SSText>
          </SSFormLayout.Item>
        )}
      </>
    )
  }

  function renderExtendedPubInputs() {
    return (
      <>
        <SSFormLayout.Item>
          <SSFormLayout.Label label={t('account.import.xpub')} />
          <SSTextInput
            align="left"
            style={{ height: 60, verticalAlign: 'top', paddingVertical: 16 }}
            value={xpub}
            onChangeText={handleXpubChange}
          />
        </SSFormLayout.Item>
        <SSFormLayout.Item>
          <SSFormLayout.Label label="Master Fingerprint" />
          <SSTextInput
            align="left"
            style={{ height: 60, verticalAlign: 'top', paddingVertical: 16 }}
            value={fingerprint}
            onChangeText={handleFingerprintChange}
            placeholder="e.g. 1234abcd"
          />
        </SSFormLayout.Item>
      </>
    )
  }

  function renderAddressInputs() {
    return (
      <SSFormLayout.Item>
        <SSFormLayout.Label label={t('watchonly.importAddress.label')} />
        <SSTextInput
          align="left"
          style={{ height: 150, verticalAlign: 'top', paddingVertical: 16 }}
          multiline
          numberOfLines={5}
          value={addressInput}
          onChangeText={handleAddressChange}
          placeholder={
            allowMultiple
              ? t('watchonly.importAddress.placeholderMultiple')
              : t('watchonly.importAddress.placeholderSingle')
          }
        />
      </SSFormLayout.Item>
    )
  }

  return (
    <ScrollView>
      <SSVStack justifyBetween>
        <SSFormLayout>
          {importType === 'descriptor' && renderDescriptorInputs()}
          {importType === 'extendedPub' && renderExtendedPubInputs()}
          {importType === 'address' && renderAddressInputs()}
        </SSFormLayout>
        <SSVStack>
          <SSButton
            label={t('watchonly.read.clipboard')}
            onPress={handlePasteFromClipboard}
          />
          <SSButton label={t('watchonly.read.qrcode')} disabled />
          <SSButton label={t('watchonly.read.nfc')} disabled />
        </SSVStack>
        {alarm ? (
          <SSText style={{ color: 'red', textAlign: 'center' }}>{alarm}</SSText>
        ) : null}
        <SSButton
          label={t('common.confirm')}
          variant="secondary"
          loading={loading}
          onPress={handleConfirm}
        />
      </SSVStack>
    </ScrollView>
  )
}
