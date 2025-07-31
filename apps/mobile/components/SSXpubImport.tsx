import * as Clipboard from 'expo-clipboard'
import { useState } from 'react'
import { ScrollView } from 'react-native'
import SSButton from './SSButton'
import SSText from './SSText'
import SSTextInput from './SSTextInput'
import SSFormLayout from '@/layouts/SSFormLayout'
import SSVStack from '@/layouts/SSVStack'
import { t } from '@/locales'
import { validateExtendedKey, validateFingerprint } from '@/utils/validation'

export type SSXpubImportProps = {
  onConfirm: (xpub: string, fingerprint: string) => Promise<void> | void
  loading?: boolean
  initialXpub?: string
  initialFingerprint?: string
}

export default function SSXpubImport({
  onConfirm,
  loading = false,
  initialXpub = '',
  initialFingerprint = ''
}: SSXpubImportProps) {
  const [xpub, setXpub] = useState(initialXpub)
  const [fingerprint, setFingerprint] = useState(initialFingerprint)
  const [alarm, setAlarm] = useState('')

  function handleXpubChange(text: string) {
    setXpub(text)
    setAlarm('')
  }
  function handleFingerprintChange(text: string) {
    setFingerprint(text)
    setAlarm('')
  }

  async function handlePasteFromClipboard() {
    const text = await Clipboard.getStringAsync()
    if (!text) return

    // Try to detect if it's an xpub or fingerprint
    if (validateExtendedKey(text)) {
      setXpub(text)
    } else if (validateFingerprint(text)) {
      setFingerprint(text)
    } else {
      // If it's not clearly one or the other, assume it's an xpub
      setXpub(text)
    }
  }

  async function handleConfirm() {
    if (!validateExtendedKey(xpub)) {
      setAlarm('Invalid XPUB/YPUB/ZPUB/VPUB')
      return
    }
    if (!validateFingerprint(fingerprint)) {
      setAlarm('Invalid fingerprint')
      return
    }
    await onConfirm(xpub, fingerprint)
  }

  return (
    <ScrollView>
      <SSVStack justifyBetween>
        <SSFormLayout>
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
