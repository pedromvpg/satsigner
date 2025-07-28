import { type Network } from 'bdk-rn/lib/lib/enums'
import * as Print from 'expo-print'
import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useEffect, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { captureRef } from 'react-native-view-shot'

import { getWalletData } from '@/api/bdk'
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
import { shareFile } from '@/utils/filesystem'

export default function ExportDescriptors() {
  const { id: accountId } = useLocalSearchParams<AccountSearchParams>()

  const account = useAccountsStore((state) =>
    state.accounts.find((_account) => _account.id === accountId)
  )
  const network = useBlockchainStore((state) => state.selectedNetwork)

  const [exportContent, setExportContent] = useState('')
  const qrRef = useRef<View>(null)

  useEffect(() => {
    async function getDescriptors() {
      if (!account) return
      const pin = await getItem(PIN_KEY)
      if (!pin) return
      try {
        const isImportAddress = account.keys[0].creationType === 'importAddress'

        const temporaryAccount = JSON.parse(JSON.stringify(account)) as Account

        for (const key of temporaryAccount.keys) {
          const decryptedSecretString = await aesDecrypt(
            key.secret as string,
            pin,
            key.iv
          )
          const decryptedSecret = JSON.parse(decryptedSecretString) as Secret
          key.secret = decryptedSecret
        }

        const walletData = !isImportAddress
          ? await getWalletData(temporaryAccount, network as Network)
          : undefined

        const descriptors = !isImportAddress
          ? [walletData?.externalDescriptor!, walletData?.internalDescriptor!]
          : [
              (typeof temporaryAccount.keys[0].secret === 'object' &&
                temporaryAccount.keys[0].secret.externalDescriptor!) as string
            ]

        setExportContent(descriptors.join('\n'))
      } catch {
        // TODO
      }
    }
    getDescriptors()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function exportDescriptors() {
    if (!account) return
    const date = new Date().toISOString().slice(0, -5)
    const ext = 'txt'
    const filename = `${t(
      'export.file.name.descriptors'
    )}_${accountId}_${date}.${ext}`
    shareFile({
      filename,
      fileContent: exportContent,
      dialogTitle: t('export.file.save'),
      mimeType: `text/plain`
    })
  }

  async function exportDescriptorsPDF() {
    if (!account || !exportContent) return

    try {
      // Generate PDF with QR code using a different approach
      generatePDF()
    } catch (error) {
      console.error('Error generating PDF:', error)
    }
  }

  async function generatePDF() {
    if (!account || !exportContent) return

    try {
      // Capture QR code as image using react-native-view-shot
      let qrDataURL = ''
      if (qrRef.current) {
        qrDataURL = await captureRef(qrRef.current, {
          format: 'png',
          quality: 0.9,
          result: 'data-uri'
        })
      }

      await createPDFWithQR(qrDataURL)
    } catch (error) {
      console.error('Error generating PDF:', error)
      // Fallback without QR code
      await createPDFWithQR('')
    }
  }

  async function createPDFWithQR(qrDataURL: string) {
    if (!account) return

    const date = new Date().toISOString().slice(0, -5)
    const title = `Output descriptor for ${account.name}`

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
            @page {
              margin: 1in;
              size: A4;
            }
            
            body {
              font-family: 'Courier New', monospace;
              margin: 0;
              padding: 20px;
              background-color: white;
              color: black;
              line-height: 1.4;
            }
            
            .header {
              text-align: center;
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 30px;
              border-bottom: 3px solid #000;
              padding-bottom: 15px;
            }
            
            .qr-section {
              text-align: center;
              margin: 30px 0;
              page-break-inside: avoid;
            }
            
            .qr-code {
              max-width: 300px;
              max-height: 300px;
              border: 2px solid #000;
              margin: 0 auto;
              display: block;
            }
            
            .qr-info {
              margin-top: 15px;
              font-size: 14px;
              color: #666;
              font-style: italic;
            }
            
            .descriptor-section {
              margin-top: 40px;
              page-break-inside: avoid;
            }
            
            .descriptor-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #333;
            }
            
            .descriptor-text {
              font-family: 'Courier New', monospace;
              font-size: 11px;
              word-break: break-all;
              background-color: #f8f8f8;
              padding: 20px;
              border: 1px solid #ddd;
              border-left: 4px solid #007ACC;
              margin: 15px 0;
              line-height: 1.6;
            }
            
            .info-section {
              margin-top: 30px;
              background-color: #f0f8ff;
              padding: 15px;
              border-radius: 5px;
              border: 1px solid #ccc;
            }
            
            .info-title {
              font-weight: bold;
              margin-bottom: 10px;
              color: #333;
            }
            
            .info-list {
              font-size: 12px;
              line-height: 1.5;
              margin: 5px 0;
            }
            
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #ccc;
              padding-top: 20px;
            }
            
            .metadata {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="metadata">
            <span>Account: ${account.name}</span>
            <span>Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</span>
          </div>
          
          <div class="header">${title}</div>
          
          ${
            qrDataURL
              ? `
          <div class="qr-section">
            <img src="${qrDataURL}" class="qr-code" alt="QR Code for descriptor" />
            <div class="qr-info">Scan QR code to import this descriptor</div>
          </div>
          `
              : ''
          }
          
          <div class="descriptor-section">
            <div class="descriptor-title">Bitcoin Descriptor:</div>
            <div class="descriptor-text">${exportContent}</div>
          </div>
          
          <div class="info-section">
            <div class="info-title">Instructions:</div>
            <div class="info-list">
              • This descriptor defines how to derive addresses and keys for your wallet<br>
              • You can import this descriptor into compatible Bitcoin wallet software<br>
              • Keep this document secure as it contains your wallet's public information<br>
              • For multisig wallets, you'll need all co-signers' descriptors<br>
              • The QR code above contains the same descriptor data for easy scanning
            </div>
          </div>
          
          <div class="footer">
            <strong>Generated by SatSigner</strong><br>
            Secure Bitcoin Wallet Management
          </div>
        </body>
      </html>
    `

    try {
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      })

      const filename = `${t(
        'export.file.name.descriptors'
      )}_${accountId}_${date}.pdf`

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: t('export.file.save'),
          UTI: 'com.adobe.pdf'
        })
      }
    } catch (error) {
      console.error('Error creating PDF:', error)
    }
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
          {t('account.export.descriptors')}
        </SSText>

        {exportContent && (
          <View style={{ alignItems: 'center', marginVertical: 20 }}>
            <View ref={qrRef} style={{ padding: 10, backgroundColor: 'white' }}>
              <SSQRCode value={exportContent} size={200} />
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
            {exportContent}
          </SSText>
        </View>
        <SSClipboardCopy text={exportContent}>
          <SSButton label={t('common.copyToClipboard')} onPress={() => true} />
        </SSClipboardCopy>
        <SSButton
          label={t('account.export.descriptorsPDF')}
          variant="secondary"
          onPress={exportDescriptorsPDF}
        />
        <SSButton
          label={t('common.downloadFile')}
          variant="outline"
          onPress={exportDescriptors}
        />
        <SSButton
          label={t('common.cancel')}
          variant="ghost"
          onPress={() => router.back()}
        />
      </SSVStack>
    </ScrollView>
  )
}
