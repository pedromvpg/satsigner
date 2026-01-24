# BDK-RN Migration Analysis

## Current State

**Current Package**: `bdk-rn` from `https://github.com/LtbLightning/bdk-rn#bc918a5f58b2fb4a1c50bd21ba9206300edff43d`

**Official Package**: `bdk-rn` from `https://github.com/bitcoindevkit/bdk-rn`

## API Usage Analysis

### Core Classes Imported from `bdk-rn`
1. `Address`
2. `Blockchain`
3. `DatabaseConfig`
4. `Descriptor`
5. `DescriptorPublicKey`
6. `DescriptorSecretKey`
7. `Mnemonic`
8. `PartiallySignedTransaction` (type)
9. `TxBuilder`
10. `Wallet`

### Types Imported from `bdk-rn/lib/classes/Bindings`
1. `LocalUtxo`
2. `TransactionDetails`
3. `TxBuilderResult`

### Enums Imported from `bdk-rn/lib/lib/enums`
1. `AddressIndex`
2. `BlockchainElectrumConfig` (type)
3. `BlockchainEsploraConfig` (type)
4. `BlockChainNames`
5. `KeychainKind`
6. `Network` (type)

## Key Methods Used

### Descriptor Methods
- `new Descriptor().create(descriptor, network)`
- `new Descriptor().newBip44Public(...)`
- `new Descriptor().newBip49Public(...)`
- `new Descriptor().newBip84Public(...)`
- `new Descriptor().newBip86Public(...)`
- `descriptor.asString()`

### Wallet Methods
- `new Wallet().create(externalDescriptor, internalDescriptor, network, dbConfig)`
- `wallet.getBalance()`
- `wallet.listTransactions(includeRaw)`
- `wallet.listUnspent()`
- `wallet.getAddress(index)`
- `wallet.getInternalAddress(index)`
- `wallet.sync(blockchain)`
- `wallet.sign(psbt)`

### Blockchain Methods
- `new Blockchain().create(config, blockchainName)`
- `blockchain.broadcast(transaction)`

### TxBuilder Methods
- `new TxBuilder().create()`
- `txBuilder.addUtxos(utxos)`
- `txBuilder.manuallySelectedOnly()`
- `txBuilder.addRecipient(scriptPubKey, amount)`
- `txBuilder.feeAbsolute(fee)`
- `txBuilder.enableRbf()`
- `txBuilder.finish(wallet)`

### Address Methods
- `new Address().create(address, network)`
- `new Address().fromScript(script, network)`
- `address.asString()`
- `address.scriptPubKey()`

### Mnemonic Methods
- `new Mnemonic().fromString(mnemonic)`

### DescriptorSecretKey Methods
- `new DescriptorSecretKey().create(network, mnemonic, passphrase)`

### DescriptorPublicKey Methods
- `new DescriptorPublicKey().fromString(xpub)`

### PartiallySignedTransaction Methods
- `psbt.extractTx()`

### Transaction Methods
- `transaction.size()`
- `transaction.vsize()`
- `transaction.weight()`
- `transaction.version()`
- `transaction.lockTime()`
- `transaction.isLockTimeEnabled()`
- `transaction.serialize()`
- `transaction.input()`
- `transaction.output()`

### DatabaseConfig Methods
- `new DatabaseConfig().memory()`

## Files Using BDK-RN (35+ files)

### Primary Integration Points
1. `apps/mobile/api/bdk.ts` - Main BDK API wrapper (1045 lines)
2. `apps/mobile/hooks/useSyncAccountWithWallet.ts`
3. `apps/mobile/hooks/usePSBTManagement.ts`
4. `apps/mobile/hooks/useNostrSignFlow.ts`
5. `apps/mobile/hooks/useContentProcessor.ts`
6. `apps/mobile/utils/bip32.ts`
7. `apps/mobile/utils/bip39.ts`
8. `apps/mobile/utils/validation.ts`
9. `apps/mobile/store/blockchain.ts`
10. `apps/mobile/store/wallets.ts`
11. Multiple component files for account creation, import, export

## Critical Features Used

1. **Wallet Creation**
   - From mnemonic (BIP44/49/84/86)
   - From descriptors
   - Multisig wallets
   - Watch-only wallets

2. **Transaction Building**
   - UTXO selection
   - Output creation
   - Fee management
   - RBF support

3. **Blockchain Backends**
   - Electrum
   - Esplora

4. **Address Generation**
   - External addresses
   - Internal (change) addresses
   - Stop gap support

5. **PSBT Handling**
   - Signing
   - Extraction
   - Broadcasting

## Next Steps for Testing

1. Install official bdk-rn in test branch
2. Run TypeScript compiler to check type compatibility
3. Test each critical API method
4. Verify build process works
5. Run existing unit tests
