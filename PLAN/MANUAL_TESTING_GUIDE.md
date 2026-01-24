# Manual Testing Guide - BDK-RN Migration

## Testing the Migration

The development server should be starting. Once it's ready, you can test the app to verify the bdk-rn migration is working correctly.

## Quick Start

### 1. Start Development Server
```bash
cd apps/mobile
yarn start
```

Or if already running, scan the QR code or press:
- `a` for Android
- `i` for iOS
- `w` for web

### 2. Test Critical BDK Functionality

#### ✅ Wallet Creation
1. **Single-sig Wallet**
   - Create a new wallet with mnemonic
   - Verify wallet is created successfully
   - Check that addresses are generated correctly

2. **Multi-sig Wallet**
   - Create a multi-sig wallet
   - Verify all keys are recognized
   - Check descriptor generation

3. **Watch-only Wallet**
   - Import an extended public key
   - Verify wallet syncs correctly
   - Check address generation

#### ✅ Wallet Operations
1. **Address Generation**
   - Navigate to wallet
   - Verify addresses are displayed
   - Check address format (should match network)

2. **Balance Display**
   - Check wallet balance displays correctly
   - Verify balance updates after sync

3. **Transaction History**
   - View transaction list
   - Verify transactions display correctly
   - Check transaction details

#### ✅ Transaction Building
1. **Create Transaction**
   - Select UTXOs
   - Enter recipient address
   - Set fee
   - Build transaction
   - Verify transaction builds successfully

2. **PSBT Signing**
   - Create or import PSBT
   - Sign transaction
   - Verify signing completes
   - Check transaction details

#### ✅ Wallet Syncing
1. **Sync with Electrum**
   - Select Electrum backend
   - Sync wallet
   - Verify sync completes
   - Check balance updates

2. **Sync with Esplora**
   - Select Esplora backend
   - Sync wallet
   - Verify sync completes
   - Check balance updates

#### ✅ Address Validation
1. **Address Format Detection**
   - Test mainnet addresses (bc1, 1, 3 prefixes)
   - Test testnet addresses (tb1, m, n prefixes)
   - Verify network auto-detection works

2. **Address Import**
   - Import various address formats
   - Verify addresses are accepted
   - Check network detection

## What to Watch For

### ✅ Expected Behavior
- Wallet creation works without errors
- Addresses generate correctly
- Transactions build successfully
- PSBT signing completes
- Wallet syncs with blockchain backends
- Balance displays correctly
- Transaction history loads

### ⚠️ Potential Issues to Report
- **Crashes**: Any app crashes when using BDK features
- **Errors**: Error messages related to bdk-rn
- **Network Issues**: Problems with address network detection
- **Sync Failures**: Wallet sync not working
- **Transaction Failures**: Transaction building or signing errors
- **Performance**: Significant slowdowns in wallet operations

## Testing Checklist

- [ ] App starts without errors
- [ ] Create single-sig wallet
- [ ] Create multi-sig wallet
- [ ] Create watch-only wallet
- [ ] Generate addresses
- [ ] Display balance
- [ ] View transaction history
- [ ] Build transaction
- [ ] Sign PSBT
- [ ] Sync with Electrum
- [ ] Sync with Esplora
- [ ] Import addresses (various formats)
- [ ] Network detection works correctly

## Network Detection Test

Since `Address.create()` now auto-detects network, test with:

1. **Mainnet addresses**:
   - `bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh` (bech32)
   - `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa` (legacy)
   - `3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy` (P2SH)

2. **Testnet addresses**:
   - `tb1qlj64u6fqutr0xue85kl55fx0gt4m4urun25p7q` (bech32)
   - `mzBc4XEFSdzCDcTxAgf6EZXgsZWpztRhef` (legacy)

3. **Verify**: Network should be detected automatically without errors

## Reporting Issues

If you encounter any issues:

1. **Note the exact error message**
2. **Record the steps to reproduce**
3. **Check console logs** for bdk-rn related errors
4. **Document the network** (mainnet/testnet/signet)
5. **Note the wallet type** (singlesig/multisig/watch-only)

## Success Criteria

✅ **Migration is successful if**:
- All wallet operations work as before
- No new errors appear
- Performance is similar or better
- All BDK features function correctly

## Next Steps After Testing

Once manual testing is complete:
1. Document any issues found
2. Verify fixes if needed
3. Update migration status
4. Consider production deployment
