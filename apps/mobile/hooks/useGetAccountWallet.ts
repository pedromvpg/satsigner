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

  const [account, updateAccount] = useAccountsStore(
    useShallow((state) => [
      state.accounts.find((a) => a.id === id),
      state.updateAccount
    ])
  )

  async function addWallet() {
    try {
      if (
        !account ||
        account.keys.length === 0 ||
        account.keys[0].creationType === 'importAddress'
      ) {
        return
      }

      // Create a copy of the account with decrypted secrets
      const temporaryAccount = JSON.parse(JSON.stringify(account)) as Account
      const pin = await getItem(PIN_KEY)

      if (!pin) {
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
            throw new Error(`Failed to decrypt key secret: ${decryptError}`)
          }
        }
      }

      const walletData = await getWalletData(
        temporaryAccount,
        account.network as Network
      )
      if (!walletData) {
        return
      }

      // Update account with fingerprint if it's not already set
      if (walletData.fingerprint && !account.keys[0].fingerprint) {
        const updatedAccount = { ...account }
        updatedAccount.keys[0].fingerprint = walletData.fingerprint
        await updateAccount(updatedAccount)
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
