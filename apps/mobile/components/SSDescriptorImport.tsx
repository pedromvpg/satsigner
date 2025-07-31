import * as Clipboard from 'expo-clipboard'
import { useState } from 'react'
import { ScrollView } from 'react-native'
import SSButton from './SSButton'
import SSText from './SSText'
import SSTextInput from './SSTextInput'
import SSFormLayout from '@/layouts/SSFormLayout'
import SSVStack from '@/layouts/SSVStack'
import { t } from '@/locales'
import { validateDescriptorSync } from '@/utils/validation'

export type SSDescriptorImportProps = {
  onConfirm: (external: string, internal?: string) => Promise<void> | void
  loading?: boolean
  initialExternal?: string
  initialInternal?: string
}

export default function SSDescriptorImport({
  onConfirm,
  loading = false,
  initialExternal = '',
  initialInternal = ''
}: SSDescriptorImportProps) {
  const [externalDescriptor, setExternalDescriptor] = useState(initialExternal)
  const [internalDescriptor, setInternalDescriptor] = useState(initialInternal)
  const [alarm, setAlarm] = useState('')

  function handleExternalChange(text: string) {
    setExternalDescriptor(text)
    setAlarm('')
  }
  function handleInternalChange(text: string) {
    setInternalDescriptor(text)
    setAlarm('')
  }

  async function handlePasteFromClipboard() {
    const text = await Clipboard.getStringAsync()
    if (!text) return

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
    if (externalDescriptor) setExternalDescriptor(externalDescriptor)
    if (internalDescriptor) setInternalDescriptor(internalDescriptor)
  }

  async function handleConfirm() {
    if (!validateDescriptorSync(externalDescriptor)) {
      setAlarm(t('watchonly.importDescriptor.invalid'))
      return
    }
    if (internalDescriptor && !validateDescriptorSync(internalDescriptor)) {
      setAlarm(t('watchonly.importDescriptor.invalid'))
      return
    }
    await onConfirm(externalDescriptor, internalDescriptor)
  }

  return (
    <ScrollView>
      <SSVStack justifyBetween>
        <SSFormLayout>
          <SSFormLayout.Item>
            <SSFormLayout.Label label={t('common.descriptor')} />
            <SSTextInput
              align="left"
              style={{ height: 150, verticalAlign: 'top', paddingVertical: 16 }}
              multiline
              numberOfLines={5}
              value={externalDescriptor}
              onChangeText={handleExternalChange}
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
              onChangeText={handleInternalChange}
              placeholder={t('watchonly.importDescriptor.internalPlaceholder')}
            />
          </SSFormLayout.Item>
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
