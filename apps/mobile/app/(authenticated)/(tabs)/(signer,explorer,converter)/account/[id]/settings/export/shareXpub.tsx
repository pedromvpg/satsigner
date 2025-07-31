import * as Clipboard from 'expo-clipboard'
import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { toast } from 'sonner-native'

import { SSIconEyeOn } from '@/components/icons'
import SSButton from '@/components/SSButton'
import SSQRCode from '@/components/SSQRCode'
import SSText from '@/components/SSText'
import { PIN_KEY } from '@/config/auth'
import SSHStack from '@/layouts/SSHStack'
import SSVStack from '@/layouts/SSVStack'
import { t } from '@/locales'
import { getItem } from '@/storage/encrypted'
import { useAccountsStore } from '@/store/accounts'
import { Colors } from '@/styles'
import { type Secret } from '@/types/models/Account'
import { type AccountSearchParams } from '@/types/navigation/searchParams'
import { aesDecrypt } from '@/utils/crypto'

type ShareXpubSearchParams = AccountSearchParams & {
  keyIndex: string
}

export default function ShareXpub() {
  const { id: accountId, keyIndex } =
    useLocalSearchParams<ShareXpubSearchParams>()

  const account = useAccountsStore((state) =>
    state.accounts.find((_account) => _account.id === accountId)
  )

  const [xpubContent, setXpubContent] = useState('')
  const [keyName, setKeyName] = useState('')
  const [fingerprint, setFingerprint] = useState('')
  const qrRef = useRef<View>(null)

  useEffect(() => {
    async function getXpub() {
      if (!account || !keyIndex) return
      const pin = await getItem(PIN_KEY)
      if (!pin) return

      try {
        const keyIndexNum = parseInt(keyIndex, 10)
        const key = account.keys[keyIndexNum]

        if (!key) return

        // Set key name
        setKeyName(key.name || `Key ${keyIndexNum + 1}`)

        // Decrypt the key's secret
        let decryptedSecret: Secret
        if (typeof key.secret === 'string') {
          const decryptedSecretString = await aesDecrypt(
            key.secret,
            pin,
            key.iv
          )
          decryptedSecret = JSON.parse(decryptedSecretString) as Secret
        } else {
          decryptedSecret = key.secret as Secret
        }

        // Extract xpub and fingerprint
        const xpub =
          decryptedSecret.extendedPublicKey || decryptedSecret.xpub || ''
        const fp = key.fingerprint || decryptedSecret.fingerprint || ''

        setXpubContent(xpub)
        setFingerprint(fp)
      } catch {
        // Handle error silently
      }
    }
    getXpub()
  }, [account, keyIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCopyToClipboard() {
    if (!xpubContent) return

    try {
      await Clipboard.setStringAsync(xpubContent)
      toast.success(t('common.copiedToClipboard'))
    } catch {
      toast.error(t('common.copyFailed'))
    }
  }

  async function handleNFCShare() {
    if (!xpubContent) return

    // TODO: Implement NFC writing functionality
    // For now, show a message that this feature is not yet implemented
    toast.error('NFC sharing not yet implemented')
  }

  if (!account) return <Redirect href="/" />

  return (
    <ScrollView style={{ width: '100%' }}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <SSHStack gap="sm">
              <SSText uppercase>{account.name}</SSText>
              {account.policyType === 'watchonly' && (
                <SSIconEyeOn stroke="#fff" height={16} width={16} />
              )}
            </SSHStack>
          ),
          headerRight: undefined
        }}
      />
      <SSVStack style={{ padding: 20 }}>
        <SSText center uppercase color="muted">
          {t('account.seed.sharePub')}
        </SSText>

        {keyName && (
          <SSText center color="white" size="lg">
            {keyName}
          </SSText>
        )}

        {fingerprint && (
          <SSText center color="muted" size="md">
            {t('account.fingerprint')}: {fingerprint}
          </SSText>
        )}

        {xpubContent && (
          <View style={{ alignItems: 'center', marginVertical: 20 }}>
            <View ref={qrRef} style={{ padding: 10, backgroundColor: 'white' }}>
              <SSQRCode value={xpubContent} size={200} />
            </View>
          </View>
        )}

        <View
          style={{
            padding: 10,
            backgroundColor: Colors.gray[950],
            borderRadius: 5
          }}
        >
          <SSText color="white" size="md" type="mono">
            {xpubContent}
          </SSText>
        </View>

        <SSVStack gap="sm">
          <SSButton
            label={t('common.copyToClipboard')}
            onPress={handleCopyToClipboard}
          />
          <SSButton
            label={t('common.shareViaNFC')}
            variant="secondary"
            onPress={handleNFCShare}
            disabled={false}
          />
          <SSButton
            label={t('common.cancel')}
            variant="ghost"
            onPress={() => router.back()}
          />
        </SSVStack>
      </SSVStack>
    </ScrollView>
  )
}
