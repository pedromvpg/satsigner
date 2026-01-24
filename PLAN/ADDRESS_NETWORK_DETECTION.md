# Address Network Detection in bdk-rn

## API Change: Address.create()

### Before (Fork)
```typescript
const address = await new Address().create(addressString, network)
```

### After (Official Package)
```typescript
const address = await new Address().create(addressString)
// Network is automatically detected from address format
```

## How Network Detection Works

The official `bdk-rn` package **automatically detects the network** from the address format itself. Bitcoin addresses encode network information in their prefix:

### Address Format → Network Mapping

| Address Prefix | Network | Examples |
|---------------|---------|----------|
| `bc1` | Bitcoin (Mainnet) | `bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh` |
| `1` | Bitcoin (Mainnet) | `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa` |
| `3` | Bitcoin (Mainnet) | `3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy` |
| `tb1` | Testnet | `tb1qlj64u6fqutr0xue85kl55fx0gt4m4urun25p7q` |
| `m`, `n` | Testnet | `mzBc4XEFSdzCDcTxAgf6EZXgsZWpztRhef` |
| `bcrt1` | Regtest | `bcrt1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh` |
| `sb1` | Signet | `sb1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh` |

## Getting Network from Address

If you need to know the network of an address after creating it, use the `network()` method:

```typescript
const address = await new Address().create(addressString)
const detectedNetwork = await address.network()
// Returns: Network.Bitcoin | Network.Testnet | Network.Signet | Network.Regtest
```

## Example Usage

### Creating Address (Network Auto-Detected)
```typescript
// Mainnet address
const mainnetAddr = await new Address().create('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh')
const network = await mainnetAddr.network() // Returns Network.Bitcoin

// Testnet address
const testnetAddr = await new Address().create('tb1qlj64u6fqutr0xue85kl55fx0gt4m4urun25p7q')
const network2 = await testnetAddr.network() // Returns Network.Testnet
```

### Getting ScriptPubKey
```typescript
// Network parameter is no longer needed
async function getScriptPubKeyFromAddress(address: string) {
  const recipientAddress = await new Address().create(address)
  return recipientAddress.scriptPubKey()
}
```

## Why This Change?

This change makes the API more robust because:

1. **Single Source of Truth**: The address format itself is the authoritative source for network information
2. **Prevents Errors**: No risk of passing incorrect network parameter
3. **Simpler API**: One less parameter to manage
4. **Standard Practice**: Bitcoin addresses are designed to encode network information

## Migration Notes

### Code That Needs No Changes
- Most code using `Address.create()` - just remove the network parameter
- Code that doesn't need to know the network explicitly

### Code That Might Need Updates
- If you were using the network parameter for validation, use `address.network()` instead
- If you need to verify network matches expected network:
  ```typescript
  const address = await new Address().create(addressString)
  const detectedNetwork = await address.network()
  if (detectedNetwork !== expectedNetwork) {
    throw new Error('Address network mismatch')
  }
  ```

## Related Methods

### fromScript() - Still Requires Network
```typescript
// This method still requires network because scripts don't encode network info
const address = await new Address().fromScript(script, network)
```

The `fromScript()` method still requires a network parameter because scripts (scriptPubKey) don't encode network information - only addresses do.

## Current Implementation

In `apps/mobile/api/bdk.ts`:

```typescript
async function getScriptPubKeyFromAddress(address: string, network: Network) {
  // Address.create() auto-detects network from address format (bc1, tb1, etc.)
  // The network parameter is kept for API compatibility but not used
  const recipientAddress = await new Address().create(address)
  return recipientAddress.scriptPubKey()
}
```

The `network` parameter is kept in the function signature for backward compatibility with callers, but it's not used internally since the address format encodes the network.
