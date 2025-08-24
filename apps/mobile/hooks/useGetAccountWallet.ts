import { type Network } from 'bdk-rn/lib/lib/enums'
import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { getWalletData } from '@/api/bdk'
import { PIN_KEY } from '@/config/auth'
import { getItem } from '@/storage/encrypted'
import { useAccountsStore } from '@/store/accounts'
import { useWalletsStore } from '@/store/wallets'
import { type Account, type Secret } from '@/types/models/Account'
import { aesDecrypt } from '@/utils/crypto'

const useGetAccountWallet = (id: Account['id']) => {
  const [wallet, addAccountWallet] = useWalletsStore(
    useShallow((state) => [state.wallets[id], state.addAccountWallet])
  )

  const account = useAccountsStore((state) =>
    state.accounts.find((a) => a.id === id)
  )

  async function addWallet() {
    try {
      if (
        !account ||
        account.keys.length === 0 ||
        account.keys[0].creationType === 'importAddress'
      ) {
        console.log('Skipping wallet creation:', {
          hasAccount: !!account,
          keyCount: account?.keys.length || 0,
          isImportAddress: account?.keys[0]?.creationType === 'importAddress'
        })
        return
      }

      // Create a copy of the account with decrypted secrets
      const temporaryAccount = JSON.parse(JSON.stringify(account)) as Account
      const pin = await getItem(PIN_KEY)

      if (!pin) {
        console.error('PIN not found for decryption')
        return
      }

      // Decrypt all key secrets
      for (const key of temporaryAccount.keys) {
        if (typeof key.secret === 'string') {
          try {
            const decryptedSecretString = await aesDecrypt(
              key.secret,
              pin,
              key.iv
            )
            const decryptedSecret = JSON.parse(decryptedSecretString) as Secret
            key.secret = decryptedSecret
          } catch (decryptError) {
            console.error('Failed to decrypt key secret:', {
              keyIndex: temporaryAccount.keys.indexOf(key),
              error: decryptError,
              hasIv: !!key.iv,
              secretType: typeof key.secret
            })
            throw new Error(`Failed to decrypt key secret: ${decryptError}`)
          }
        }
      }

      const walletData = await getWalletData(
        temporaryAccount,
        account.network as Network
      )
      if (!walletData) {
        console.error('getWalletData returned undefined')
        return
      }

      addAccountWallet(id, walletData.wallet)
    } catch (error) {
      // Silently handle errors
    }
  }

  useEffect(() => {
    if (!wallet && account) {
      addWallet()
    }
  }, [id, account]) // eslint-disable-line react-hooks/exhaustive-deps

  return wallet
}

export default useGetAccountWallet
