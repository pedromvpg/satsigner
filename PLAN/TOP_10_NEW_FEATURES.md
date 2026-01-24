# Top 10 New Features Enabled by Latest BDK

## Context: SatSigner Project

SatSigner is a **mobile Bitcoin signer management application** focused on:
- **UTXO Control** - Coin control and sat-level management
- **Privacy** - Emphasis on privacy-preserving practices
- **Visualization** - Data visualization for chain analysis
- **Labeling & Tagging** - Personal labeling and bookmarking
- **Bitcoin-only** - Sat denomination supremacy
- **Security** - Hot-signer level (future: cold, multisig, vaults)

---

## Top 10 New Features

### 1. **Advanced Coin Selection Algorithms** 🎯
**Privacy & UTXO Control Enhancement**

**What it enables:**
- **Branch and Bound** algorithm for optimal coin selection
- **Random selection** strategy for enhanced privacy
- **Largest First / Smallest First** for different use cases
- **Custom selection strategies** for specific privacy goals

**Why it matters for SatSigner:**
- Aligns perfectly with **privacy emphasis** and **UTXO control** goals
- Enables better **coin selection visualization** - show why certain UTXOs were selected
- Supports **privacy-focused transaction building** with random selection
- Better **fee optimization** through optimal algorithms

**Code References:**
- **TxBuilder Class**: `node_modules/bdk-rn/lib/classes/TxBuilder.d.ts`
  - `manuallySelectedOnly()` - Manual UTXO selection
  - `drainWallet()` - Spend all available inputs
  - `onlySpendChange()` - Only spend change outputs
  - `unspendable()` - Mark UTXOs as unspendable
- **Official BDK Docs**: https://bitcoindevkit.org/docs/
- **BDK-RN Source**: https://github.com/bitcoindevkit/bdk-rn

**Implementation Priority:** 🔥 **HIGH** - Core to privacy and UTXO control features

---

### 2. **Dynamic Fee Estimation from Blockchain** 💰
**Real-time Fee Optimization**

**What it enables:**
- Real-time fee estimation directly from blockchain backends
- **Fee rate (sat/vB) support** instead of just absolute fees
- Automatic fee calculation based on current network conditions
- Fee estimation from Electrum/Esplora backends

**Why it matters for SatSigner:**
- Better **fee visualization** - show real-time fee estimates
- **User education** - help users understand fee dynamics
- **Automated fee suggestions** based on urgency
- Supports the **visualization/UX focus** with fee charts

**Code References:**
- **Blockchain Class**: `node_modules/bdk-rn/lib/classes/Blockchain.d.ts`
  - `estimateFee(target: number): Promise<FeeRate>` - Estimate fee for target blocks
- **TxBuilder Class**: `node_modules/bdk-rn/lib/classes/TxBuilder.d.ts`
  - `feeRate(feeRate: number)` - Set fee rate in sat/vB
  - `feeAbsolute(feeRate: number)` - Set absolute fee
- **FeeRate Type**: `node_modules/bdk-rn/lib/classes/Bindings.d.ts`
- **Official BDK Docs**: https://bitcoindevkit.org/docs/

**Implementation Priority:** 🔥 **HIGH** - Enhances user experience and education

---

### 3. **CPFP (Child-Pays-For-Parent) Support** ⚡
**Transaction Management Enhancement**

**What it enables:**
- Build child transactions to accelerate stuck parent transactions
- Fee bumping through child transactions
- Better handling of low-fee transactions stuck in mempool

**Why it matters for SatSigner:**
- **UTXO control** - users can manage stuck transactions
- **Visualization opportunity** - show transaction dependency chains
- **User empowerment** - gives users control over transaction confirmation
- Aligns with **coin control** philosophy

**Code References:**
- **BumpFeeTxBuilder Class**: `node_modules/bdk-rn/lib/classes/BumpFeeTxBuilder.d.ts`
  - `create(txid: string, newFeeRate: number)` - Create fee bump builder
  - `allowShrinking(address: string)` - Allow reducing output to bump fee
  - `enableRbf()` - Enable RBF signaling
  - `finish(wallet: Wallet)` - Build the fee-bumped transaction
- **Official BDK Docs**: https://bitcoindevkit.org/docs/

**Implementation Priority:** 🟡 **MEDIUM** - Useful feature for power users

---

### 4. **Time-locked Transactions** ⏰
**Advanced Transaction Features**

**What it enables:**
- **Absolute locktime** - transactions that become valid at specific block height/time
- **Relative locktime** - transactions with time-based conditions
- **Time-locked descriptors** - wallets with spending time restrictions

**Why it matters for SatSigner:**
- **Security enhancement** - supports future vault features
- **Visualization** - show time-locked transaction states
- **Education** - teach users about advanced Bitcoin features
- Supports **future multisig/vault ambitions**

**Code References:**
- **Transaction Class**: `node_modules/bdk-rn/lib/classes/Transaction.d.ts`
  - `lockTime()` - Get transaction locktime
  - `isLockTimeEnabled()` - Check if locktime is enabled
- **TxBuilder Class**: `node_modules/bdk-rn/lib/classes/TxBuilder.d.ts`
  - Transaction building with locktime support
- **Descriptor Class**: `node_modules/bdk-rn/lib/classes/Descriptor.d.ts`
  - Miniscript support for time-locked descriptors
- **Official BDK Docs**: https://bitcoindevkit.org/docs/

**Note:** Locktime is set at the transaction level. For descriptor-level time locks, use Miniscript.

**Implementation Priority:** 🟡 **MEDIUM** - Supports future security features

---

### 5. **Enhanced Database Options (SQLite/Sled)** 💾
**Performance & Persistence**

**What it enables:**
- **SQLite database** - Persistent wallet storage without external dependencies
- **Sled database** - Alternative embedded database backend
- Better performance for large wallets
- Persistent storage without relying on external systems

**Why it matters for SatSigner:**
- **Performance** - faster wallet operations for users with many UTXOs
- **Reliability** - persistent storage reduces data loss risk
- **Privacy** - local database keeps data on-device
- Better **UTXO management** for large wallets

**Code References:**
- **DatabaseConfig Class**: `node_modules/bdk-rn/lib/classes/DatabaseConfig.d.ts`
  - `memory()` - In-memory database (current implementation)
  - `sqlite(path: string)` - SQLite persistent database
  - `sled(path: string, treeName: string)` - Sled embedded database
- **Usage in Wallet.create()**: `node_modules/bdk-rn/lib/classes/Wallet.d.ts`
  - `create(descriptor, internalDescriptor, network, dbConfig)`
- **Official BDK Docs**: https://bitcoindevkit.org/docs/

**Implementation Priority:** 🟡 **MEDIUM** - Performance improvement

---

### 6. **Miniscript Support** 🔐
**Advanced Multisig & Spending Conditions**

**What it enables:**
- Complex spending conditions beyond basic multisig
- Time-based conditions, threshold signatures, and more
- Native support for advanced descriptor types
- Better multisig transaction building

**Why it matters for SatSigner:**
- Supports **future multisig/vault ambitions**
- **Education** - teach advanced Bitcoin scripting
- **Visualization** - visualize complex spending conditions
- **Security** - enables more sophisticated security models

**Code References:**
- **Descriptor Class**: `node_modules/bdk-rn/lib/classes/Descriptor.d.ts`
  - `create(descriptor: string, network: Network)` - Supports Miniscript descriptors
  - Miniscript can be used in descriptor strings (e.g., `wsh(multi(...))`, `wsh(and_v(...))`)
- **Official BDK Docs**: https://bitcoindevkit.org/docs/
- **Miniscript Documentation**: https://bitcoin.sipa.be/miniscript/

**Note:** Miniscript is supported through descriptor strings. The BDK library parses and validates Miniscript expressions.

**Implementation Priority:** 🟢 **LOW** (Future) - Supports long-term goals

---

### 7. **RPC Backend Support** 🖥️
**Direct Node Connection**

**What it enables:**
- Direct connection to Bitcoin Core node
- No reliance on third-party Electrum/Esplora servers
- Full node integration for privacy-conscious users
- Custom blockchain data sources

**Why it matters for SatSigner:**
- **Privacy** - users can connect to their own nodes
- **Decentralization** - supports self-hosted infrastructure
- **Education** - teaches users about running full nodes
- Aligns with **open-source and privacy ethos**

**Code References:**
- **Blockchain Class**: `node_modules/bdk-rn/lib/classes/Blockchain.d.ts`
  - `create(config, blockchainName?: BlockChainNames)` - Supports RPC config
- **BlockChainNames Enum**: `node_modules/bdk-rn/lib/lib/enums.d.ts`
  - `BlockChainNames.Rpc = "Rpc"`
- **BlockchainRpcConfig Type**: `node_modules/bdk-rn/lib/lib/enums.d.ts`
  - `url: string` - RPC server URL
  - `authCookie?: string` - Cookie authentication
  - `authUserPass?: UserPass` - Username/password auth
  - `network: Network` - Bitcoin network
  - `walletName: string` - Wallet name
  - `syncParams?: RpcSyncParams` - Sync configuration
- **Official BDK Docs**: https://bitcoindevkit.org/docs/

**Implementation Priority:** 🟡 **MEDIUM** - Privacy and decentralization

---

### 8. **Enhanced PSBT Operations** 📝
**Better Multisig Support**

**What it enables:**
- Better PSBT combination for multisig workflows
- PSBT analysis and inspection tools
- Enhanced serialization formats
- Better debugging of partially signed transactions

**Why it matters for SatSigner:**
- **Future multisig support** - better foundation
- **Visualization** - show PSBT state and requirements
- **Education** - teach users about multisig workflows
- **Collaborative transactions** - supports mobile joinmarket ambitions

**Code References:**
- **PartiallySignedTransaction Class**: `node_modules/bdk-rn/lib/classes/PartiallySignedTransaction.d.ts`
  - `combine(other: PartiallySignedTransaction)` - Combine PSBTs (BIP 174)
  - `extractTx()` - Extract final transaction
  - `serialize()` - Serialize PSBT
  - `txid()` - Get transaction ID
  - `feeAmount()` - Get fee amount
  - `feeRate()` - Get fee rate
  - `jsonSerialize()` - Get PSBT as JSON
- **Wallet Class**: `node_modules/bdk-rn/lib/classes/Wallet.d.ts`
  - `sign(psbt: PartiallySignedTransaction, signOptions?: SignOptions)` - Sign PSBT
- **Official BDK Docs**: https://bitcoindevkit.org/docs/

**Implementation Priority:** 🟡 **MEDIUM** - Supports future features

---

### 9. **Native Address Labeling** 🏷️
**Enhanced Address Management**

**What it enables:**
- Built-in address labeling support
- Better address tracking and history
- Native address metadata management
- Enhanced address validation and analysis

**Why it matters for SatSigner:**
- **Labeling emphasis** - aligns with personal labeling/tagging goals
- **Visualization** - better address management UI
- **UTXO control** - link labels to UTXOs
- **Privacy** - track address usage patterns

**Code References:**
- **Address Class**: `node_modules/bdk-rn/lib/classes/Address.d.ts`
  - `create(address: string)` - Create address (auto-detects network)
  - `network()` - Get address network
  - `asString()` - Get address as string
  - `scriptPubKey()` - Get script pubkey
  - `payload()` - Get address payload
- **Wallet Class**: `node_modules/bdk-rn/lib/classes/Wallet.d.ts`
  - `getAddress(index)` - Get address by index
  - `getInternalAddress(index)` - Get change address
- **AddressInfo Type**: `node_modules/bdk-rn/lib/classes/Bindings.d.ts`
  - Contains address, index, and keychain info
- **Official BDK Docs**: https://bitcoindevkit.org/docs/

**Note:** Address labeling is typically implemented at the application level. BDK provides the address management infrastructure.

**Implementation Priority:** 🟡 **MEDIUM** - Aligns with core features

---

### 10. **Compact Block Filters Backend** 🔍
**Lightweight Privacy-Preserving Sync**

**What it enables:**
- Lightweight blockchain synchronization
- Privacy-preserving sync method
- Reduced bandwidth usage
- Alternative to Electrum/Esplora for privacy

**Why it matters for SatSigner:**
- **Privacy** - more private sync method
- **Performance** - faster sync for mobile
- **Education** - teach users about different sync methods
- **Visualization** - show sync progress and methods

**Code References:**
- **Blockchain Class**: `node_modules/bdk-rn/lib/classes/Blockchain.d.ts`
  - `create(config, blockchainName?)` - Supports various backend types
- **BlockChainNames Enum**: `node_modules/bdk-rn/lib/lib/enums.d.ts`
  - Current: `Electrum`, `Esplora`, `Rpc`
  - **Note:** Compact Block Filters may be available in future BDK versions
- **Official BDK Docs**: https://bitcoindevkit.org/docs/
- **BDK Rust Source**: https://github.com/bitcoindevkit/bdk (check for compact filter support)

**Note:** Compact Block Filters support may require checking the latest BDK Rust library version. The React Native bindings follow the underlying BDK capabilities.

**Implementation Priority:** 🟢 **LOW** (Future) - Nice to have

---

## Feature Prioritization Matrix

### Immediate Impact (High Priority)
1. ✅ **Advanced Coin Selection** - Core to privacy and UTXO control
2. ✅ **Dynamic Fee Estimation** - Enhances UX and education

### Medium-Term Value (Medium Priority)
3. ✅ **CPFP Support** - Transaction management
4. ✅ **Time-locked Transactions** - Security features
5. ✅ **Enhanced Database Options** - Performance
6. ✅ **RPC Backend** - Privacy and decentralization
7. ✅ **Enhanced PSBT Operations** - Multisig foundation
8. ✅ **Native Address Labeling** - Core feature alignment

### Long-Term Goals (Low Priority)
9. ✅ **Miniscript Support** - Advanced features
10. ✅ **Compact Block Filters** - Privacy enhancement

---

## Implementation Roadmap Suggestion

### Phase 1: Core Enhancements (Months 1-2)
- Advanced Coin Selection Algorithms
- Dynamic Fee Estimation

### Phase 2: Transaction Features (Months 3-4)
- CPFP Support
- Time-locked Transactions

### Phase 3: Infrastructure (Months 5-6)
- Enhanced Database Options
- RPC Backend Support

### Phase 4: Advanced Features (Months 7+)
- Enhanced PSBT Operations
- Native Address Labeling
- Miniscript Support
- Compact Block Filters

---

## Alignment with SatSigner Goals

### ✅ Privacy Emphasis
- Advanced Coin Selection (random strategies)
- RPC Backend (self-hosted)
- Compact Block Filters (privacy-preserving sync)

### ✅ UTXO Control
- Advanced Coin Selection (optimal algorithms)
- CPFP Support (transaction management)
- Enhanced Database (better UTXO management)

### ✅ Visualization
- Dynamic Fee Estimation (fee charts)
- CPFP Support (transaction chains)
- Advanced Coin Selection (selection visualization)

### ✅ Education
- All features provide learning opportunities
- Time-locked Transactions (advanced concepts)
- Miniscript (scripting education)

### ✅ Security
- Time-locked Transactions (vault support)
- Miniscript (advanced security)
- Enhanced PSBT (multisig foundation)

---

## Code Repository Links

### Official BDK-RN Repository
- **GitHub**: https://github.com/bitcoindevkit/bdk-rn
- **NPM Package**: https://www.npmjs.com/package/bdk-rn
- **Official BDK Docs**: https://bitcoindevkit.org/docs/
- **BDK Rust Library**: https://github.com/bitcoindevkit/bdk

### Local Code References (After Installation)
All TypeScript definitions are available in:
- `node_modules/bdk-rn/lib/classes/` - Main class definitions
- `node_modules/bdk-rn/lib/lib/enums.d.ts` - Enum definitions
- `node_modules/bdk-rn/lib/lib/utils.d.ts` - Utility functions
- `node_modules/bdk-rn/lib/classes/Bindings.d.ts` - Type definitions

### Quick Access to Key Files
```bash
# View all available classes
ls node_modules/bdk-rn/lib/classes/

# View specific class definition
cat node_modules/bdk-rn/lib/classes/TxBuilder.d.ts
cat node_modules/bdk-rn/lib/classes/Blockchain.d.ts
cat node_modules/bdk-rn/lib/classes/DatabaseConfig.d.ts
cat node_modules/bdk-rn/lib/classes/BumpFeeTxBuilder.d.ts
```

---

## Conclusion

The latest BDK enables features that **perfectly align** with SatSigner's core values:
- **Privacy** through better coin selection and sync methods
- **UTXO Control** through advanced algorithms and management
- **Visualization** through fee estimation and transaction analysis
- **Education** through advanced Bitcoin features
- **Security** through time-locks and multisig support

These features will help SatSigner become the **powerful, privacy-focused, visually-rich Bitcoin signer** it aims to be! 🚀

---

## Implementation Notes

### Coin Selection Algorithms
**Note**: Advanced coin selection algorithms (Branch and Bound, Random, etc.) are typically handled internally by BDK when using `TxBuilder` methods. The selection strategy can be influenced by:
- `manuallySelectedOnly()` - Forces manual selection
- `drainWallet()` - Uses all available UTXOs
- `onlySpendChange()` - Only uses change outputs
- `unspendable()` - Excludes specific UTXOs

For explicit coin selection strategies, check the underlying BDK Rust library documentation.

### Feature Availability
Some features may require checking the latest BDK Rust library version, as the React Native bindings follow the capabilities of the underlying BDK library. Always refer to:
1. The official BDK documentation
2. The bdk-rn GitHub repository for React Native-specific implementations
3. The BDK Rust library for core feature availability
