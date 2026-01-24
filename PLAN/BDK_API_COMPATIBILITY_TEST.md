# BDK-RN API Compatibility Test

## Test Plan

This document outlines the tests needed to verify compatibility between the current `LtbLightning/bdk-rn` fork and the official `bitcoindevkit/bdk-rn` package.

## Import Path Comparison

### Current Imports (LtbLightning/bdk-rn)

```typescript
// Main exports
import {
  Address,
  Blockchain,
  DatabaseConfig,
  Descriptor,
  DescriptorPublicKey,
  DescriptorSecretKey,
  Mnemonic,
  PartiallySignedTransaction,
  TxBuilder,
  Wallet
} from 'bdk-rn'

// Types
import {
  LocalUtxo,
  TransactionDetails,
  TxBuilderResult
} from 'bdk-rn/lib/classes/Bindings'

// Enums
import {
  AddressIndex,
  BlockchainElectrumConfig,
  BlockchainEsploraConfig,
  BlockChainNames,
  KeychainKind,
  Network
} from 'bdk-rn/lib/lib/enums'
```

### Expected Official Package Structure

Based on the official repository structure, the package should have similar exports. Need to verify:
1. Same class names
2. Same method signatures
3. Same enum values
4. Same import paths

## Critical API Methods to Test

### 1. Descriptor API
- [ ] `new Descriptor().create(descriptor: string, network: Network)`
- [ ] `new Descriptor().newBip44Public(...)`
- [ ] `new Descriptor().newBip49Public(...)`
- [ ] `new Descriptor().newBip84Public(...)`
- [ ] `new Descriptor().newBip86Public(...)`
- [ ] `descriptor.asString(): Promise<string>`

### 2. Wallet API
- [ ] `new Wallet().create(external, internal, network, dbConfig)`
- [ ] `wallet.getBalance(): Promise<Balance>`
- [ ] `wallet.listTransactions(includeRaw: boolean): Promise<TransactionDetails[]>`
- [ ] `wallet.listUnspent(): Promise<LocalUtxo[]>`
- [ ] `wallet.getAddress(index: AddressIndex | number): Promise<AddressInfo>`
- [ ] `wallet.getInternalAddress(index: number): Promise<AddressInfo>`
- [ ] `wallet.sync(blockchain: Blockchain): Promise<void>`
- [ ] `wallet.sign(psbt: PartiallySignedTransaction): Promise<PartiallySignedTransaction>`

### 3. Blockchain API
- [ ] `new Blockchain().create(config, blockchainName): Promise<Blockchain>`
- [ ] `blockchain.broadcast(transaction: Transaction): Promise<string>`

### 4. TxBuilder API
- [ ] `new TxBuilder().create(): Promise<TxBuilder>`
- [ ] `txBuilder.addUtxos(utxos: Array<{txid: string, vout: number}>): Promise<void>`
- [ ] `txBuilder.manuallySelectedOnly(): Promise<void>`
- [ ] `txBuilder.addRecipient(scriptPubKey: Script, amount: number): Promise<void>`
- [ ] `txBuilder.feeAbsolute(fee: number): Promise<void>`
- [ ] `txBuilder.enableRbf(): Promise<void>`
- [ ] `txBuilder.finish(wallet: Wallet): Promise<TxBuilderResult>`

### 5. Address API
- [ ] `new Address().create(address: string, network: Network): Promise<Address>`
- [ ] `new Address().fromScript(script: Script, network: Network): Promise<Address>`
- [ ] `address.asString(): Promise<string>`
- [ ] `address.scriptPubKey(): Promise<Script>`

### 6. Mnemonic API
- [ ] `new Mnemonic().fromString(mnemonic: string): Promise<Mnemonic>`

### 7. DescriptorSecretKey API
- [ ] `new DescriptorSecretKey().create(network, mnemonic, passphrase): Promise<DescriptorSecretKey>`

### 8. DescriptorPublicKey API
- [ ] `new DescriptorPublicKey().fromString(xpub: string): Promise<DescriptorPublicKey>`

### 9. PartiallySignedTransaction API
- [ ] `psbt.extractTx(): Promise<Transaction>`

### 10. Transaction API
- [ ] `transaction.size(): Promise<number>`
- [ ] `transaction.vsize(): Promise<number>`
- [ ] `transaction.weight(): Promise<number>`
- [ ] `transaction.version(): Promise<number>`
- [ ] `transaction.lockTime(): Promise<number>`
- [ ] `transaction.isLockTimeEnabled(): Promise<boolean>`
- [ ] `transaction.serialize(): Promise<number[]>`
- [ ] `transaction.input(): Promise<Input[]>`
- [ ] `transaction.output(): Promise<Output[]>`

### 11. DatabaseConfig API
- [ ] `new DatabaseConfig().memory(): Promise<DatabaseConfig>`

## Enum Values to Verify

### Network Enum
- [ ] `Network.Bitcoin`
- [ ] `Network.Testnet`
- [ ] `Network.Signet`
- [ ] `Network.Regtest`

### KeychainKind Enum
- [ ] `KeychainKind.External`
- [ ] `KeychainKind.Internal`

### AddressIndex Enum
- [ ] `AddressIndex.New`
- [ ] `AddressIndex.LastUnused`
- [ ] `AddressIndex.Peek(index: number)`

### BlockChainNames Enum
- [ ] `BlockChainNames.Electrum`
- [ ] `BlockChainNames.Esplora`

## Type Definitions to Verify

### BlockchainElectrumConfig
```typescript
type BlockchainElectrumConfig = {
  url: string
  socks5?: string
  retry?: number
  timeout?: number
  stopGap?: number
}
```

### BlockchainEsploraConfig
```typescript
type BlockchainEsploraConfig = {
  baseUrl: string
  proxy?: string
  concurrency?: number
  stopGap?: number
  timeout?: number
}
```

### LocalUtxo
```typescript
type LocalUtxo = {
  outpoint: {
    txid: string
    vout: number
  }
  txout: {
    value: number
    script: Script
  }
  keychain: KeychainKind
  isSpent: boolean
}
```

### TransactionDetails
```typescript
type TransactionDetails = {
  txid: string
  received: number
  sent: number
  fee?: number
  confirmationTime?: {
    height: number
    timestamp: number
  }
  transaction?: Transaction
}
```

### TxBuilderResult
```typescript
type TxBuilderResult = {
  psbt: PartiallySignedTransaction
  transactionDetails?: TransactionDetails
}
```

## Testing Steps

1. **Install Official Package**
   ```bash
   cd apps/mobile
   yarn add bdk-rn@latest
   # or
   yarn add https://github.com/bitcoindevkit/bdk-rn
   ```

2. **Run TypeScript Compiler**
   ```bash
   yarn type-check
   ```
   This will reveal any type mismatches immediately.

3. **Create Test File**
   Create a test file that imports all used APIs and verifies they exist.

4. **Run Unit Tests**
   ```bash
   yarn test:unit
   ```

5. **Test Critical Paths**
   - Wallet creation from mnemonic
   - Descriptor creation
   - Transaction building
   - PSBT signing

## Expected Issues

Based on typical package migrations, potential issues might include:

1. **Import Path Changes**
   - Types might be in different locations
   - Enum paths might have changed

2. **Method Signature Changes**
   - Parameters might be in different order
   - Return types might be different
   - Some methods might be async/sync

3. **Type Definition Changes**
   - Type names might have changed
   - Optional vs required fields

4. **Enum Value Changes**
   - Enum names might be different
   - Values might be different

## Success Criteria

Migration is successful if:
- ✅ All imports resolve correctly
- ✅ TypeScript compilation passes
- ✅ All unit tests pass
- ✅ Critical wallet operations work
- ✅ No runtime errors in test scenarios
