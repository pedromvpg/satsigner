import * as Clipboard from 'expo-clipboard'
import { useState } from 'react'
import { ScrollView } from 'react-native'
import SSButton from './SSButton'
import SSText from './SSText'
import SSTextInput from './SSTextInput'
import SSFormLayout from '@/layouts/SSFormLayout'
import SSVStack from '@/layouts/SSVStack'
import { t } from '@/locales'
import { validateAddress } from '@/utils/validation'

export type SSAddressImportProps = {
  onConfirm: (addresses: string[]) => Promise<void> | void
  loading?: boolean
  initialAddresses?: string[]
  allowMultiple?: boolean
}

export default function SSAddressImport({
  onConfirm,
  loading = false,
  initialAddresses = [],
  allowMultiple = true
}: SSAddressImportProps) {
  const [addressInput, setAddressInput] = useState(initialAddresses.join('\n'))
  const [alarm, setAlarm] = useState('')

  function handleAddressChange(text: string) {
    setAddressInput(text)
    setAlarm('')
  }

  async function handlePasteFromClipboard() {
    const text = await Clipboard.getStringAsync()
    if (!text) return

    setAddressInput(text)
  }

  async function handleConfirm() {
    const addresses = addressInput
      .split('\n')
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0)

    if (addresses.length === 0) {
      setAlarm(t('watchonly.importAddress.empty'))
      return
    }

    // Validate each address
    for (const address of addresses) {
      if (!validateAddress(address)) {
        setAlarm(t('watchonly.importAddress.invalid'))
        return
      }
    }

    // If multiple addresses not allowed, only use the first one
    const finalAddresses = allowMultiple ? addresses : [addresses[0]]
    await onConfirm(finalAddresses)
  }

  return (
    <ScrollView>
      <SSVStack justifyBetween>
        <SSFormLayout>
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
