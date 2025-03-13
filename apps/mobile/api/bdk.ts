import {
  Address,
  Blockchain,
  DatabaseConfig,
  Descriptor,
  DescriptorPublicKey,
  DescriptorSecretKey,
  Mnemonic,
  type PartiallySignedTransaction,
  TxBuilder,
  Wallet
} from 'bdk-rn'
import {
  type LocalUtxo,
  type TransactionDetails,
  type TxBuilderResult
} from 'bdk-rn/lib/classes/Bindings'
import {
  AddressIndex,
  type BlockchainElectrumConfig,
  type BlockchainEsploraConfig,
  BlockChainNames,
  KeychainKind,
  type Network
} from 'bdk-rn/lib/lib/enums'

import { type Account, type Key, type Secret } from '@/types/models/Account'
import { type Output } from '@/types/models/Output'
import { type Transaction } from '@/types/models/Transaction'
import { type Utxo } from '@/types/models/Utxo'
import { type Backend } from '@/types/settings/blockchain'

async function generateMnemonic(
  mnemonicWordCount: NonNullable<Key['mnemonicWordCount']>
) {
  const mnemonic = await new Mnemonic().create(mnemonicWordCount)
  return mnemonic.asString()
}

async function validateMnemonic(mnemonic: NonNullable<Secret['mnemonic']>) {
  try {
    await new Mnemonic().fromString(mnemonic)
  } catch (_) {
    return false
  }
  return true
}

async function getWalletData(account: Account, network: Network) {
  switch (account.policyType) {
    case 'singlesig': {
      if (account.keys.length !== 1)
        throw new Error('Invalid key count for singlesig')

      const key = account.keys[0]

      if (
        key.creationType === 'generateMnemonic' ||
        key.creationType === 'importMnemonic'
      ) {
        if (
          typeof key.secret === 'string' ||
          !key.secret.mnemonic ||
          !key.scriptVersion
        )
          throw new Error('Invalid secret')

        const walletData = await getWalletFromMnemonic(
          key.secret.mnemonic,
          key.scriptVersion,
          key.secret.passphrase,
          network
        )

        return walletData
      } else if (key.creationType === 'importDescriptor') {
        // TODO
      }
      break
    }
    case 'multisig': {
      const extendedPublicKeys = account.keys
        .map((key) => {
          if (typeof key.secret === 'object' && key.secret?.extendedPublicKey) {
            return key.secret.extendedPublicKey
          }
          return null
        })
        .filter((x): x is string => x !== null)

      const multisigDescriptorString = `wsh(multi(${account.keysRequired},${extendedPublicKeys.join(',')}))`
      const multisigDescriptor = await new Descriptor().create(
        multisigDescriptorString,
        network
      )

      const parsedDescriptor = await parseDescriptor(multisigDescriptor)
      const wallet = await getWalletFromDescriptor(
        multisigDescriptor,
        null,
        network
      )

      return {
        fingerprint: parsedDescriptor.fingerprint,
        derivationPath: parsedDescriptor.derivationPath,
        externalDescriptor: multisigDescriptorString,
        internalDescriptor: '',
        wallet
      }
    }
    case 'watchonly': {
      if (account.keys.length !== 1)
        throw new Error('Invalid key count for singlesig')

      const key = account.keys[0]

      if (key.creationType === 'importDescriptor') {
        if (typeof key.secret === 'string' || !key.secret.externalDescriptor)
          throw new Error('Invalid secret')

        const externalDescriptor = await new Descriptor().create(
          key.secret.externalDescriptor,
          network
        )
        const internalDescriptor = key.secret.internalDescriptor
          ? await new Descriptor().create(
              key.secret.internalDescriptor,
              network
            )
          : null

        const parsedDescriptor = await parseDescriptor(externalDescriptor)
        const wallet = await getWalletFromDescriptor(
          externalDescriptor,
          internalDescriptor,
          network
        )

        return {
          fingerprint: parsedDescriptor.fingerprint,
          derivationPath: parsedDescriptor.derivationPath,
          externalDescriptor: await externalDescriptor.asString(),
          internalDescriptor: internalDescriptor
            ? await internalDescriptor.asString()
            : '',
          wallet
        }
      } else if (key.creationType === 'importExtendedPub') {
        if (
          !key.scriptVersion ||
          !key.fingerprint ||
          typeof key.secret === 'string' ||
          !key.secret.extendedPublicKey
        )
          throw new Error('Invalid account information')

        const extendedPublicKey = await new DescriptorPublicKey().fromString(
          key.secret.extendedPublicKey
        )

        let externalDescriptor: Descriptor
        let internalDescriptor: Descriptor

        switch (key.scriptVersion) {
          case 'P2PKH':
            externalDescriptor = await new Descriptor().newBip44Public(
              extendedPublicKey,
              key.fingerprint,
              KeychainKind.External,
              network
            )
            internalDescriptor = await new Descriptor().newBip44Public(
              extendedPublicKey,
              key.fingerprint,
              KeychainKind.Internal,
              network
            )
            break
          case 'P2SH-P2WPKH':
            externalDescriptor = await new Descriptor().newBip49Public(
              extendedPublicKey,
              key.fingerprint,
              KeychainKind.External,
              network
            )
            internalDescriptor = await new Descriptor().newBip49Public(
              extendedPublicKey,
              key.fingerprint,
              KeychainKind.Internal,
              network
            )
            break
          case 'P2WPKH':
            externalDescriptor = await new Descriptor().newBip84Public(
              extendedPublicKey,
              key.fingerprint,
              KeychainKind.External,
              network
            )
            internalDescriptor = await new Descriptor().newBip84Public(
              extendedPublicKey,
              key.fingerprint,
              KeychainKind.Internal,
              network
            )
            break
          case 'P2TR':
            externalDescriptor = await new Descriptor().newBip86Public(
              extendedPublicKey,
              key.fingerprint,
              KeychainKind.External,
              network
            )
            internalDescriptor = await new Descriptor().newBip86Public(
              extendedPublicKey,
              key.fingerprint,
              KeychainKind.Internal,
              network
            )
            break
        }

        const parsedDescriptor = await parseDescriptor(externalDescriptor)
        const wallet = await getWalletFromDescriptor(
          externalDescriptor,
          internalDescriptor,
          network
        )

        return {
          fingerprint: parsedDescriptor.fingerprint,
          derivationPath: parsedDescriptor.derivationPath,
          externalDescriptor: await externalDescriptor.asString(),
          internalDescriptor: await internalDescriptor.asString(),
          wallet
        }
      } else if (key.creationType === 'importAddress') {
        // BDK does not support address descriptor
      }

      break
    }
  }
}

async function getWalletFromMnemonic(
  mnemonic: NonNullable<Secret['mnemonic']>,
  scriptVersion: NonNullable<Key['scriptVersion']>,
  passphrase: Secret['passphrase'],
  network: Network
) {
  const [externalDescriptor, internalDescriptor] = await Promise.all([
    getDescriptor(
      mnemonic,
      scriptVersion,
      KeychainKind.External,
      passphrase,
      network
    ),
    getDescriptor(
      mnemonic,
      scriptVersion,
      KeychainKind.Internal,
      passphrase,
      network
    )
  ])

  const [{ fingerprint, derivationPath }, wallet] = await Promise.all([
    parseDescriptor(externalDescriptor),
    getWalletFromDescriptor(externalDescriptor, internalDescriptor, network)
  ])

  return {
    fingerprint,
    derivationPath,
    externalDescriptor: await externalDescriptor.asString(),
    internalDescriptor: await internalDescriptor.asString(),
    wallet
  }
}

async function getDescriptor(
  mnemonic: NonNullable<Secret['mnemonic']>,
  scriptVersion: NonNullable<Key['scriptVersion']>,
  kind: KeychainKind,
  passphrase: Secret['passphrase'],
  network: Network
) {
  const parsedMnemonic = await new Mnemonic().fromString(mnemonic)
  const descriptorSecretKey = await new DescriptorSecretKey().create(
    network,
    parsedMnemonic,
    passphrase
  )
  switch (scriptVersion) {
    case 'P2PKH':
      return new Descriptor().newBip44(descriptorSecretKey, kind, network)
    case 'P2SH-P2WPKH':
      return new Descriptor().newBip49(descriptorSecretKey, kind, network)
    case 'P2WPKH':
      return new Descriptor().newBip84(descriptorSecretKey, kind, network)
    case 'P2TR':
      return new Descriptor().newBip86(descriptorSecretKey, kind, network)
  }
}

async function parseDescriptor(descriptor: Descriptor) {
  const descriptorString = await descriptor.asString()
  const match = descriptorString.match(/\[([0-9a-f]+)([0-9'/]+)\]/)
  return match
    ? { fingerprint: match[1], derivationPath: `m${match[2]}` }
    : { fingerprint: '', derivationPath: '' }
}

async function getWalletFromDescriptor(
  externalDescriptor: Descriptor,
  internalDescriptor: Descriptor | null | undefined,
  network: Network
) {
  const dbConfig = await new DatabaseConfig().memory()
  const wallet = await new Wallet().create(
    externalDescriptor,
    internalDescriptor,
    network,
    dbConfig
  )

  return wallet
}

async function extractExtendedKeyFromDescriptor(descriptor: Descriptor) {
  const descriptorString = await descriptor.asString()
  const match = descriptorString.match(/(tpub|xpub|vpub|zpub)[A-Za-z0-9]+/)
  return match ? match[0] : ''
}

async function getExtendedPublicKeyFromAccountKey(key: Key, network: Network) {
  if (typeof key.secret === 'string') return
  if (!key.secret.mnemonic || !key.scriptVersion) return

  const externalDescriptor = await getDescriptor(
    key.secret.mnemonic,
    key.scriptVersion,
    KeychainKind.External,
    key.secret.passphrase,
    network
  )
  const extendedKey = await extractExtendedKeyFromDescriptor(externalDescriptor)

  return extendedKey
}

async function syncWallet(
  wallet: Wallet,
  backend: Backend,
  blockchainConfig: BlockchainElectrumConfig | BlockchainEsploraConfig
) {
  const blockchain = await getBlockchain(backend, blockchainConfig)
  await wallet.sync(blockchain)
}

async function getBlockchain(
  backend: Backend,
  config: BlockchainElectrumConfig | BlockchainEsploraConfig
) {
  let blockchainName: BlockChainNames = BlockChainNames.Electrum
  if (backend === 'esplora') blockchainName = BlockChainNames.Esplora

  const blockchain = await new Blockchain().create(config, blockchainName)
  return blockchain
}

async function getWalletOverview(
  wallet: Wallet,
  netWork: Network
): Promise<Pick<Account, 'transactions' | 'utxos' | 'summary'>> {
  if (wallet) {
    const [balance, addressInfo, transactionsDetails, localUtxos] =
      await Promise.all([
        wallet.getBalance(),
        wallet.getAddress(AddressIndex.New),
        wallet.listTransactions(true),
        wallet.listUnspent()
      ])

    const transactions = await Promise.all(
      (transactionsDetails || []).map((transactionDetails) =>
        parseTransactionDetailsToTransaction(
          transactionDetails,
          localUtxos,
          netWork
        )
      )
    )

    const utxos = await Promise.all(
      (localUtxos || []).map((localUtxo) =>
        parseLocalUtxoToUtxo(localUtxo, transactionsDetails, netWork)
      )
    )

    return {
      transactions,
      utxos,
      summary: {
        balance: balance.confirmed,
        numberOfAddresses: addressInfo.index + 1,
        numberOfTransactions: transactionsDetails.length,
        numberOfUtxos: localUtxos.length,
        satsInMempool: balance.trustedPending + balance.untrustedPending
      }
    }
  } else {
    return {
      transactions: [],
      utxos: [],
      summary: {
        balance: 0,
        numberOfAddresses: 0,
        numberOfTransactions: 0,
        numberOfUtxos: 0,
        satsInMempool: 0
      }
    }
  }
}

async function parseTransactionDetailsToTransaction(
  transactionDetails: TransactionDetails,
  utxos: LocalUtxo[],
  network: Network
): Promise<Transaction> {
  const transactionUtxos = utxos.filter(
    (utxo) => utxo?.outpoint?.txid === transactionDetails.txid
  )

  let address = ''
  const utxo = transactionUtxos?.[0]
  if (utxo) address = await getAddress(utxo, network)

  const { confirmationTime, fee, received, sent, transaction, txid } =
    transactionDetails

  let lockTimeEnabled = false
  let lockTime = 0
  let size = 0
  let version = 0
  let vsize = 0
  let weight = 0
  let raw: number[] = []
  const vin: Transaction['vin'] = []
  const vout: Transaction['vout'] = []

  if (transaction) {
    size = await transaction.size()
    vsize = await transaction.vsize()
    weight = await transaction.weight()
    version = await transaction.version()
    lockTime = await transaction.lockTime()
    lockTimeEnabled = await transaction.isLockTimeEnabled()
    raw = await transaction.serialize()

    const inputs = await transaction.input()
    const outputs = await transaction.output()

    for (const index in inputs) {
      const input = inputs[index]
      const script = await input.scriptSig.toBytes()
      input.scriptSig = script
      vin.push(input)
    }

    for (const index in outputs) {
      const { value, script: scriptObj } = outputs[index]
      const script = await scriptObj.toBytes()
      const addressObj = await new Address().fromScript(scriptObj, network)
      const address = await addressObj.asString()
      vout.push({ value, address, script })
    }
  }

  return {
    id: txid,
    type: sent ? 'send' : 'receive',
    sent,
    received,
    label: '',
    fee,
    prices: {},
    timestamp: confirmationTime?.timestamp
      ? new Date(confirmationTime.timestamp * 1000)
      : undefined,
    blockHeight: confirmationTime?.height,
    address,
    size,
    vsize,
    vout,
    version,
    weight,
    lockTime,
    lockTimeEnabled,
    raw,
    vin
  }
}

async function parseLocalUtxoToUtxo(
  localUtxo: LocalUtxo,
  transactionsDetails: TransactionDetails[],
  network: Network
): Promise<Utxo> {
  const addressTo = await getAddress(localUtxo, network)
  const transactionId = localUtxo?.outpoint.txid
  const transactionDetails = transactionsDetails.find(
    (transactionDetails) => transactionDetails.txid === transactionId
  )
  const script = await localUtxo.txout.script.toBytes()

  return {
    txid: transactionId,
    vout: localUtxo?.outpoint.vout,
    value: localUtxo?.txout.value,
    timestamp: transactionDetails?.confirmationTime?.timestamp
      ? new Date(transactionDetails.confirmationTime.timestamp * 1000)
      : undefined,
    label: '',
    addressTo,
    script,
    keychain: 'external'
  }
}

async function getAddress(utxo: LocalUtxo, network: Network) {
  const script = utxo.txout.script
  const address = await new Address().fromScript(script, network)
  return address.asString()
}

async function getFingerprint(
  mnemonic: NonNullable<Secret['mnemonic']>,
  passphrase: Secret['passphrase'],
  network: Network
) {
  const bdkMnemonic = await new Mnemonic().fromString(mnemonic)
  const descriptorSecretKey = await new DescriptorSecretKey().create(
    network,
    bdkMnemonic,
    passphrase
  )
  const descriptor = await new Descriptor().newBip84(
    descriptorSecretKey,
    KeychainKind.External,
    network
  )

  const { fingerprint } = await parseDescriptor(descriptor)
  return fingerprint
}

async function getLastUnusedAddressFromWallet(wallet: Wallet) {
  const newAddress = await wallet.getAddress(AddressIndex.New)

  return newAddress
}

async function getScriptPubKeyFromAddress(address: string) {
  const recipientAddress = await new Address().create(address)
  return recipientAddress.scriptPubKey()
}

async function buildTransaction(
  wallet: Wallet,
  data: {
    inputs: Utxo[]
    outputs: Output[]
    feeRate: number
    options: {
      rbf: boolean
    }
  }
) {
  const transactionBuilder = await new TxBuilder().create()

  await transactionBuilder.addUtxos(
    data.inputs.map((utxo) => ({ txid: utxo.txid, vout: utxo.vout }))
  )
  await transactionBuilder.manuallySelectedOnly()

  for (const output of data.outputs) {
    const recipient = await getScriptPubKeyFromAddress(output.to)
    await transactionBuilder.addRecipient(recipient, output.amount)
  }

  await transactionBuilder.feeAbsolute(data.feeRate)

  if (data.options.rbf) await transactionBuilder.enableRbf()

  const transactionBuilderResult = await transactionBuilder.finish(wallet)
  return transactionBuilderResult
}

async function signTransaction(transaction: TxBuilderResult, wallet: Wallet) {
  const partiallySignedTransaction = await wallet.sign(transaction.psbt)
  return partiallySignedTransaction
}

async function broadcastTransaction(
  psbt: PartiallySignedTransaction,
  blockchain: Blockchain
) {
  const transaction = await psbt.extractTx()

  const result = await blockchain.broadcast(transaction)
  return result
}

export {
  broadcastTransaction,
  buildTransaction,
  extractExtendedKeyFromDescriptor,
  generateMnemonic,
  getBlockchain,
  getDescriptor,
  getExtendedPublicKeyFromAccountKey,
  getFingerprint,
  getLastUnusedAddressFromWallet,
  getWalletData,
  getWalletFromDescriptor,
  getWalletFromMnemonic,
  getWalletOverview,
  parseDescriptor,
  signTransaction,
  syncWallet,
  validateMnemonic
}
