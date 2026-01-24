# Electrum Connection Debugging

## Issue
Wallet not syncing - checking Electrum server connection

## Potential Issues Found

### 1. Timeout Units Mismatch
**Location**: `apps/mobile/hooks/useSyncAccountWithWallet.ts:41`

The timeout is being multiplied by 1000:
```typescript
timeout: config.timeout * 1000  // Converting seconds to milliseconds
```

But in `getBlockchainConfig`, it's used directly:
```typescript
timeout: options.timeout || 5,  // Expects milliseconds?
```

**Question**: Does BDK expect timeout in seconds or milliseconds?

Looking at the code:
- `config.timeout` is in seconds (from Config type)
- It's multiplied by 1000 to get milliseconds
- But BDK might expect seconds, not milliseconds!

### 2. URL Format
The URL format is: `ssl://bitcoin.lu.ke:50002`

BDK's `BlockchainElectrumConfig` expects:
- `url: string` - The full URL

This should work, but let's verify.

## Debugging Steps

### Added Logging
I've added detailed console logging to:
1. `syncWallet()` - Logs sync start, config, and result
2. `getBlockchain()` - Logs blockchain creation attempt and config

### Check Console Output
When you try to sync, check the console for:
- `[BDK] Starting wallet sync...`
- `[BDK] Creating blockchain with config:`
- `[BDK] Failed to create blockchain:` (if error)
- `[BDK] Sync result:`

## Test Connection

You can test the Electrum connection using the existing test method:

```typescript
import ElectrumClient from '@/api/electrum'

// Test connection
const result = await ElectrumClient.test(
  'ssl://bitcoin.lu.ke:50002',
  'bitcoin',
  10000 // timeout in milliseconds
)
```

## Next Steps

1. **Check console logs** when syncing
2. **Verify timeout units** - Check if BDK expects seconds or milliseconds
3. **Test direct connection** using `ElectrumClient.test()`
4. **Check if URL format is correct** for BDK

## Potential Fix

If timeout is the issue, we might need to:
- Remove the `* 1000` multiplication if BDK expects seconds
- Or ensure BDK gets milliseconds correctly

Let's see what the console logs show first!
