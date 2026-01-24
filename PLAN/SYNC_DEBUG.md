# Wallet Sync Debugging

## Issue
Wallet not syncing after migration to official bdk-rn@0.30.0

## Changes Made

### 1. Sync Return Value Check
The `wallet.sync()` method now returns `Promise<boolean>` instead of `Promise<void>`.

**Updated**: `apps/mobile/api/bdk.ts`
- Now checks if sync returns `false` and throws an error
- Returns the sync result for debugging

### 2. Better Error Handling
**Updated**: `apps/mobile/hooks/useSyncAccountWithWallet.ts`
- Changed from silent catch to logging errors
- Re-throws errors to see actual error messages
- Added console.error for debugging

**Updated**: `apps/mobile/api/bdk.ts` - `getBlockchain()`
- Added try-catch with detailed error logging
- Logs backend type and config for debugging

## How to Debug

1. **Check Console Logs**
   - Look for "Wallet sync error:" messages
   - Look for "Failed to create blockchain:" messages
   - Check for any bdk-rn related errors

2. **Check Sync Return Value**
   - The sync method now returns a boolean
   - `true` = success
   - `false` = failure (now throws error)

3. **Verify Blockchain Config**
   - Check that backend URL is correct
   - Verify network matches wallet network
   - Check timeout/retry settings

## Potential Issues

### 1. Blockchain Creation
- Check if `Blockchain.create()` signature changed
- Verify config format matches expected type
- Check if `BlockChainNames` enum values match

### 2. Network Mismatch
- Ensure wallet network matches blockchain network
- Check if network parameter is correctly passed

### 3. Backend Connection
- Verify Electrum/Esplora server is accessible
- Check network connectivity
- Verify server URL format

## Next Steps

1. Run the app and check console for error messages
2. Try syncing a wallet and capture the error
3. Check if the error is:
   - Blockchain creation failure
   - Network mismatch
   - Connection issue
   - API signature change

## Testing

After fixes, test:
- [ ] Sync with Electrum backend
- [ ] Sync with Esplora backend
- [ ] Sync on mainnet
- [ ] Sync on testnet
- [ ] Check error messages in console
