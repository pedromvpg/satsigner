import { type Network } from 'bdk-rn/lib/lib/enums'
import * as Clipboard from 'expo-clipboard'
import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { captureRef } from 'react-native-view-shot'

import { SSIconEyeOn } from '@/components/icons'
import SSButton from '@/components/SSButton'
import SSClipboardCopy from '@/components/SSClipboardCopy'
import SSQRCode from '@/components/SSQRCode'
import SSText from '@/components/SSText'
import { PIN_KEY } from '@/config/auth'
import SSHStack from '@/layouts/SSHStack'
import SSVStack from '@/layouts/SSVStack'
import { t } from '@/locales'
import { getItem } from '@/storage/encrypted'
import { useAccountsStore } from '@/store/accounts'
import { useBlockchainStore } from '@/store/blockchain'
import { Colors } from '@/styles'
import { type Account, type Secret } from '@/types/models/Account'
import { type AccountSearchParams } from '@/types/navigation/searchParams'
import { aesDecrypt } from '@/utils/crypto'
import { toast } from 'sonner-native'

type ShareDescriptorSearchParams = AccountSearchParams & {
  keyIndex: string
}

export default function ShareDescriptor() {
  const { id: accountId, keyIndex } =
    useLocalSearchParams<ShareDescriptorSearchParams>()

  const account = useAccountsStore((state) =>
    state.accounts.find((_account) => _account.id === accountId)
  )
  const network = useBlockchainStore((state) => state.selectedNetwork)

  const [descriptorContent, setDescriptorContent] = useState('')
  const [keyName, setKeyName] = useState('')
  const [fingerprint, setFingerprint] = useState('')
  const [derivationPath, setDerivationPath] = useState('')
  const qrRef = useRef<View>(null)

  useEffect(() => {
    async function getDescriptor() {
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

        // Extract fingerprint, derivation path, and extended public key
        // Try multiple sources for each field
        const fp = key.fingerprint || decryptedSecret.fingerprint || ''
        const path = key.derivationPath || decryptedSecret.derivationPath || ''
        const xpub =
          decryptedSecret.extendedPublicKey || decryptedSecret.xpub || ''

        console.log('Descriptor construction debug:', {
          keyIndex: keyIndexNum,
          keyName: key.name,
          scriptVersion: key.scriptVersion,
          fingerprint: fp,
          derivationPath: path,
          xpub: xpub ? `${xpub.substring(0, 10)}...` : 'missing',
          decryptedSecretKeys: Object.keys(decryptedSecret),
          keyFingerprint: key.fingerprint,
          keyDerivationPath: key.derivationPath,
          secretFingerprint: decryptedSecret.fingerprint,
          secretDerivationPath: decryptedSecret.derivationPath,
          secretExtendedPublicKey: decryptedSecret.extendedPublicKey,
          secretXpub: decryptedSecret.xpub
        })

        setFingerprint(fp)
        setDerivationPath(path)

        // Construct descriptor based on script version
        if (xpub && fp && path) {
          // Remove leading 'm' or 'M' from derivationPath if present
          const cleanPath = path.replace(/^m\/?/i, '')

          // Create descriptor based on script version
          let descriptor = ''
          switch (key.scriptVersion) {
            case 'P2PKH':
              descriptor = `pkh([${fp}/${cleanPath}]${xpub})`
              break
            case 'P2SH-P2WPKH':
              descriptor = `sh(wpkh([${fp}/${cleanPath}]${xpub}))`
              break
            case 'P2WPKH':
              descriptor = `wpkh([${fp}/${cleanPath}]${xpub})`
              break
            case 'P2TR':
              descriptor = `tr([${fp}/${cleanPath}]${xpub})`
              break
            default:
              // Fallback to P2WPKH if script version is not set
              descriptor = `wpkh([${fp}/${cleanPath}]${xpub})`
          }

          console.log('Generated descriptor:', descriptor)
          setDescriptorContent(descriptor)
        } else if (xpub) {
          // Fallback: try to create a basic descriptor without fingerprint/derivation
          // This is not ideal but better than nothing
          console.warn(
            'Creating descriptor without fingerprint/derivation path'
          )
          let descriptor = ''
          switch (key.scriptVersion) {
            case 'P2PKH':
              descriptor = `pkh(${xpub})`
              break
            case 'P2SH-P2WPKH':
              descriptor = `sh(wpkh(${xpub}))`
              break
            case 'P2WPKH':
              descriptor = `wpkh(${xpub})`
              break
            case 'P2TR':
              descriptor = `tr(${xpub})`
              break
            default:
              descriptor = `wpkh(${xpub})`
          }

          console.log('Generated fallback descriptor:', descriptor)
          setDescriptorContent(descriptor)
        } else {
          console.error('Missing required data for descriptor construction:', {
            hasXpub: !!xpub,
            hasFingerprint: !!fp,
            hasDerivationPath: !!path,
            xpubLength: xpub?.length || 0,
            fingerprintLength: fp?.length || 0,
            derivationPathLength: path?.length || 0
          })
        }
      } catch (error) {
        console.error('Error getting descriptor:', error)
      }
    }
    getDescriptor()
  }, [account, keyIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCopyToClipboard() {
    if (!descriptorContent) return

    try {
      await Clipboard.setStringAsync(descriptorContent)
      toast.success(t('common.copiedToClipboard'))
    } catch (error) {
      toast.error(t('common.copyFailed'))
    }
  }

  async function handleNFCShare() {
    if (!descriptorContent) return

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
          {t('account.seed.shareDescriptor')}
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

        {derivationPath && (
          <SSText center color="muted" size="md">
            {t('account.derivationPath')}: {derivationPath}
          </SSText>
        )}

        {descriptorContent && (
          <View style={{ alignItems: 'center', marginVertical: 20 }}>
            <View ref={qrRef} style={{ padding: 10, backgroundColor: 'white' }}>
              <SSQRCode value={descriptorContent} size={200} />
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
            {descriptorContent}
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
