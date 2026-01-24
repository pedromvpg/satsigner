# BDK-RN Migration Plan - Step by Step Guide

## Overview

This document provides a comprehensive, detailed step-by-step plan for migrating from the current `LtbLightning/bdk-rn` fork to the official `bitcoindevkit/bdk-rn` package.

**Migration Branch**: `bdk-rn` (current branch)  
**Estimated Time**: 2-5 days  
**Risk Level**: Low to Medium  
**Confidence**: High (85-90%)

## Prerequisites

### Required Tools
- [ ] Git installed and configured
- [ ] Node.js >= 22.4.0
- [ ] Yarn package manager
- [ ] TypeScript compiler
- [ ] Android Studio (for Android testing)
- [ ] Xcode (for iOS testing)
- [ ] Access to test devices/emulators

### Required Knowledge
- [ ] Understanding of React Native
- [ ] Familiarity with TypeScript
- [ ] Basic Git workflow
- [ ] Understanding of Bitcoin wallet operations

### Pre-Migration Checklist
- [ ] All current work is committed
- [ ] Current branch is clean (`git status`)
- [ ] Backup of current `package.json` and `yarn.lock`
- [ ] List of all files using `bdk-rn` (35+ files identified)
- [ ] Test suite is passing
- [ ] Development environment is set up

## Phase 1: Preparation (Day 1, Morning - 2-3 hours)

### Step 1.1: Create Backup Branch
```bash
# Ensure you're on the bdk-rn branch (current test branch)
git checkout bdk-rn
git pull origin bdk-rn

# Create backup branch from current state
git checkout -b backup/pre-bdk-rn-migration-$(date +%Y%m%d)
git push origin backup/pre-bdk-rn-migration-$(date +%Y%m%d)

# Return to bdk-rn branch (where we'll do the migration)
git checkout bdk-rn
```

**Checkpoint**: Backup branch created and pushed to remote. Migration will happen in `bdk-rn` branch.

### Step 1.2: Document Current State
```bash
# Create documentation file
cat > MIGRATION_CURRENT_STATE.md << EOF
# Current State Documentation
Date: $(date)
Branch: $(git branch --show-current)
Commit: $(git rev-parse HEAD)

## Package Information
Current Package: bdk-rn from https://github.com/LtbLightning/bdk-rn#bc918a5f58b2fb4a1c50bd21ba9206300edff43d

## Files Using BDK-RN
$(grep -r "from ['\"]bdk-rn" apps/mobile --include="*.ts" --include="*.tsx" | wc -l) files

## Test Status
$(cd apps/mobile && yarn test:unit 2>&1 | tail -5)
EOF
```

**Checkpoint**: Current state documented.

### Step 1.3: Run Full Test Suite
```bash
cd apps/mobile

# Run unit tests
yarn test:unit

# Run integration tests (if available)
yarn test:int

# Type check
yarn type-check

# Document results
echo "Pre-migration test results:" > MIGRATION_TEST_RESULTS.md
yarn test:unit >> MIGRATION_TEST_RESULTS.md 2>&1
```

**Checkpoint**: All tests passing, baseline established.

### Step 1.4: Verify Current Branch
```bash
# Verify we're on the bdk-rn branch (where migration will happen)
git branch --show-current
# Should output: bdk-rn

# Ensure branch is up to date
git pull origin bdk-rn

# Verify branch is clean
git status
# Should show: "working tree clean" or only expected files
```

**Checkpoint**: Confirmed on `bdk-rn` branch, ready for migration.

## Phase 2: Package Installation (Day 1, Afternoon - 1-2 hours)

### Step 2.1: Remove Current Package
```bash
cd apps/mobile

# Remove current fork
yarn remove bdk-rn

# Verify removal
grep -r "bdk-rn" package.json || echo "Package removed successfully"
```

**Checkpoint**: Current package removed from `package.json`.

### Step 2.2: Install Official Package
```bash
cd apps/mobile

# Option A: Install latest version from npm (if published)
yarn add bdk-rn@latest

# Option B: Install from GitHub (if not on npm)
yarn add https://github.com/bitcoindevkit/bdk-rn

# Option C: Install specific version/tag
# yarn add bdk-rn@1.0.0  # Replace with actual version

# Verify installation
yarn list bdk-rn
```

**Checkpoint**: Official package installed, version verified.

### Step 2.3: Update Lock File
```bash
cd apps/mobile

# Update yarn.lock
yarn install

# Verify changes
git diff yarn.lock | head -50
```

**Checkpoint**: Lock file updated with new package.

### Step 2.4: Verify Package Structure
```bash
cd apps/mobile

# Check if package structure exists
ls -la node_modules/bdk-rn/

# Check for TypeScript definitions
find node_modules/bdk-rn -name "*.d.ts" | head -10

# Check package.json of installed package
cat node_modules/bdk-rn/package.json | grep -A 5 '"name"'
```

**Checkpoint**: Package structure verified, TypeScript definitions present.

## Phase 3: Type Checking & Import Fixes (Day 1, Evening - 2-3 hours)

### Step 3.1: Initial Type Check
```bash
cd apps/mobile

# Run TypeScript compiler
yarn type-check > MIGRATION_TYPE_ERRORS.log 2>&1

# Review errors
cat MIGRATION_TYPE_ERRORS.log
```

**Checkpoint**: Type errors identified and documented.

### Step 3.2: Fix Import Paths (if needed)

#### Step 3.2.1: Check Main Exports
```bash
cd apps/mobile

# Check what's exported from main package
node -e "console.log(Object.keys(require('bdk-rn')))" 2>&1 || \
  cat node_modules/bdk-rn/index.js | head -50 || \
  cat node_modules/bdk-rn/src/index.ts | head -50
```

**Action**: If main exports differ, update imports in:
- `apps/mobile/api/bdk.ts` (primary file)
- All other files importing from `bdk-rn`

#### Step 3.2.2: Check Type Imports
```bash
# Check if types are in same location
ls -la node_modules/bdk-rn/lib/classes/Bindings* 2>&1
ls -la node_modules/bdk-rn/lib/lib/enums* 2>&1

# Alternative locations to check
find node_modules/bdk-rn -name "Bindings*" -o -name "*enums*" | head -10
```

**Action**: If paths differ, update imports:
```typescript
// Current:
import { type LocalUtxo } from 'bdk-rn/lib/classes/Bindings'

// May need to change to:
import { type LocalUtxo } from 'bdk-rn/lib/types/Bindings'
// or
import { type LocalUtxo } from 'bdk-rn'
```

#### Step 3.2.3: Update Import Statements

**File: `apps/mobile/api/bdk.ts`**
```typescript
// Before (lines 1-25)
import {
  Address,
  Blockchain,
  // ... existing imports
} from 'bdk-rn'
import {
  type LocalUtxo,
  // ... existing type imports
} from 'bdk-rn/lib/classes/Bindings'
import {
  AddressIndex,
  // ... existing enum imports
} from 'bdk-rn/lib/lib/enums'

// After (if paths changed)
import {
  Address,
  Blockchain,
  // ... same classes, verify they exist
} from 'bdk-rn'
import {
  type LocalUtxo,
  // ... update path if needed
} from 'bdk-rn/lib/classes/Bindings'  // or new path
import {
  AddressIndex,
  // ... update path if needed
} from 'bdk-rn/lib/lib/enums'  // or new path
```

**Checkpoint**: Import paths verified/updated in all files.

### Step 3.3: Fix Type Errors

For each type error found:

1. **Read the error message**
2. **Identify the issue**:
   - Missing type?
   - Type signature changed?
   - Enum value changed?
3. **Fix the issue**:
   - Update type imports
   - Adjust type usage
   - Update enum references

**Common fixes**:
```typescript
// If Network enum values changed
// Before:
Network.Bitcoin
// After:
Network.Mainnet  // if changed

// If method signature changed
// Before:
await wallet.getAddress(index)
// After:
await wallet.getAddress({ index })  // if now requires object
```

**Checkpoint**: All type errors resolved, TypeScript compiles successfully.

### Step 3.4: Verify All Imports
```bash
cd apps/mobile

# Find all bdk-rn imports
grep -r "from ['\"]bdk-rn" . --include="*.ts" --include="*.tsx" > MIGRATION_IMPORTS.txt

# Count files
wc -l MIGRATION_IMPORTS.txt

# Verify each file compiles
for file in $(grep -r "from ['\"]bdk-rn" . --include="*.ts" --include="*.tsx" -l); do
  echo "Checking $file..."
  npx tsc --noEmit "$file" 2>&1 | head -5
done
```

**Checkpoint**: All import statements verified.

## Phase 4: Code Updates (Day 2, Morning - 3-4 hours)

### Step 4.1: Update Main BDK API File

**File: `apps/mobile/api/bdk.ts`**

#### Step 4.1.1: Verify Class Instantiations
```typescript
// Check if constructor patterns changed
// Current:
const descriptor = await new Descriptor().create(descriptorString, network)

// Verify this still works, or if it changed to:
// const descriptor = await Descriptor.create(descriptorString, network)
```

**Action**: Test each class instantiation pattern.

#### Step 4.1.2: Verify Method Calls
```typescript
// Test critical methods
// 1. Wallet creation
const wallet = await new Wallet().create(
  externalDescriptor,
  internalDescriptor,
  network,
  dbConfig
)

// 2. Address generation
const address = await wallet.getAddress(0)

// 3. Transaction building
const txBuilder = await new TxBuilder().create()
await txBuilder.addUtxos(utxos)

// 4. PSBT signing
const signedPsbt = await wallet.sign(psbt)
```

**Action**: Verify each method call works with new package.

#### Step 4.1.3: Update Return Type Handling
```typescript
// Check if return types changed
// Current:
const balance = await wallet.getBalance()
// balance.confirmed, balance.untrustedPending, etc.

// Verify structure is the same
console.log('Balance structure:', Object.keys(balance))
```

**Checkpoint**: Main API file updated and verified.

### Step 4.2: Update Hook Files

#### Step 4.2.1: `apps/mobile/hooks/useSyncAccountWithWallet.ts`
```typescript
// Verify Wallet type import
import { type Wallet } from 'bdk-rn'  // or new path

// Verify sync method
await wallet.sync(blockchain)
```

#### Step 4.2.2: `apps/mobile/hooks/usePSBTManagement.ts`
```typescript
// Verify TxBuilderResult type
import { type TxBuilderResult } from 'bdk-rn/lib/classes/Bindings'  // or new path

// Verify PSBT operations
const psbt = txBuilderResult.psbt
const signed = await wallet.sign(psbt)
```

#### Step 4.2.3: `apps/mobile/hooks/useNostrSignFlow.ts`
```typescript
// Verify PartiallySignedTransaction import
import { PartiallySignedTransaction } from 'bdk-rn'  // or new path

// Verify transaction details
import { type TransactionDetails } from 'bdk-rn/lib/classes/Bindings'  // or new path
```

**Checkpoint**: All hook files updated.

### Step 4.3: Update Utility Files

#### Step 4.3.1: `apps/mobile/utils/bip32.ts`
```typescript
// Verify Network enum import
import { Network as BDKNetwork } from 'bdk-rn/lib/lib/enums'  // or new path

// Verify KeychainKind enum
import { KeychainKind } from 'bdk-rn/lib/lib/enums'  // or new path

// Test enum values
BDKNetwork.Bitcoin  // or Network.Mainnet if changed
KeychainKind.External
KeychainKind.Internal
```

#### Step 4.3.2: `apps/mobile/utils/bip39.ts`
```typescript
// Verify Mnemonic and DescriptorSecretKey usage
import { Mnemonic, DescriptorSecretKey } from 'bdk-rn'  // or new path

// Test mnemonic creation
const mnemonic = await new Mnemonic().fromString(mnemonicString)
```

#### Step 4.3.3: `apps/mobile/utils/validation.ts`
```typescript
// Verify Descriptor import
import { Descriptor } from 'bdk-rn'  // or new path

// Verify Network enum
import { Network } from 'bdk-rn/lib/lib/enums'  // or new path

// Test descriptor validation
const desc = await new Descriptor().create(descriptorString, network)
```

**Checkpoint**: All utility files updated.

### Step 4.4: Update Component Files

#### Step 4.4.1: Account Creation Components
Files to update:
- `apps/mobile/app/(authenticated)/(tabs)/(signer,explorer,converter)/signer/bitcoin/account/add/(common)/generate/mnemonic/[index].tsx`
- `apps/mobile/app/(authenticated)/(tabs)/(signer,explorer,converter)/signer/bitcoin/account/add/(common)/import/mnemonic/[keyIndex].tsx`
- `apps/mobile/app/(authenticated)/(tabs)/(signer,explorer,converter)/signer/bitcoin/account/add/(common)/import/descriptor/[keyIndex]/index.tsx`

**Action**: Verify all BDK imports and method calls.

#### Step 4.4.2: Account Settings Components
Files to update:
- `apps/mobile/app/(authenticated)/(tabs)/(signer,explorer,converter)/signer/bitcoin/account/[id]/settings/export/descriptor.tsx`
- `apps/mobile/app/(authenticated)/(tabs)/(signer,explorer,converter)/signer/bitcoin/account/[id]/settings/export/pubkeys.tsx`

**Action**: Verify descriptor and wallet operations.

**Checkpoint**: All component files updated.

### Step 4.5: Update Store Files

#### Step 4.5.1: `apps/mobile/store/blockchain.ts`
```typescript
// Verify Blockchain import
import { type Blockchain } from 'bdk-rn'  // or new path

// Verify getBlockchain function
import { getBlockchain } from '@/api/bdk'
```

#### Step 4.5.2: `apps/mobile/store/wallets.ts`
```typescript
// Verify Wallet type usage
import { type Wallet } from 'bdk-rn'  // or new path
```

**Checkpoint**: All store files updated.

## Phase 5: Testing (Day 2, Afternoon - 4-5 hours)

### Step 5.1: TypeScript Compilation
```bash
cd apps/mobile

# Full type check
yarn type-check

# Should complete with no errors
# If errors exist, document and fix
```

**Checkpoint**: TypeScript compiles without errors.

### Step 5.2: Unit Tests
```bash
cd apps/mobile

# Run unit tests
yarn test:unit

# Document results
yarn test:unit > MIGRATION_UNIT_TEST_RESULTS.log 2>&1

# Review failures
grep -i "fail\|error" MIGRATION_UNIT_TEST_RESULTS.log
```

**Action**: Fix any failing unit tests.

**Checkpoint**: All unit tests passing.

### Step 5.3: Integration Tests
```bash
cd apps/mobile

# Run integration tests
yarn test:int

# Document results
yarn test:int > MIGRATION_INT_TEST_RESULTS.log 2>&1
```

**Action**: Fix any failing integration tests.

**Checkpoint**: All integration tests passing.

### Step 5.4: Manual Testing - Wallet Creation

#### Test 5.4.1: Single-sig Wallet from Mnemonic
```bash
# Test scenario:
1. Create new account
2. Generate 12-word mnemonic
3. Create wallet with BIP84 (Native Segwit)
4. Verify wallet created successfully
5. Generate receiving address
6. Verify address format (starts with bc1)
```

**Checkpoint**: Single-sig wallet creation works.

#### Test 5.4.2: Multisig Wallet
```bash
# Test scenario:
1. Create multisig account
2. Add 3 keys (2-of-3)
3. Create P2WSH multisig wallet
4. Verify wallet created
5. Generate receiving address
6. Verify address format
```

**Checkpoint**: Multisig wallet creation works.

#### Test 5.4.3: Watch-only Wallet
```bash
# Test scenario:
1. Import xpub
2. Create watch-only wallet
3. Verify wallet created
4. Generate receiving address
5. Verify can't sign (expected behavior)
```

**Checkpoint**: Watch-only wallet creation works.

### Step 5.5: Manual Testing - Transaction Operations

#### Test 5.5.1: Transaction Building
```bash
# Test scenario:
1. Select UTXOs
2. Add output
3. Set fee
4. Build transaction
5. Verify PSBT created
6. Verify transaction details correct
```

**Checkpoint**: Transaction building works.

#### Test 5.5.2: PSBT Signing
```bash
# Test scenario:
1. Build transaction
2. Sign with local key
3. Verify signature added
4. Extract transaction
5. Verify transaction hex
```

**Checkpoint**: PSBT signing works.

#### Test 5.5.3: Wallet Syncing
```bash
# Test scenario:
1. Connect to Electrum/Esplora
2. Sync wallet
3. Verify balance updated
4. Verify transactions loaded
5. Verify UTXOs loaded
```

**Checkpoint**: Wallet syncing works.

### Step 5.6: Build Testing

#### Test 5.6.1: Android Build
```bash
cd apps/mobile

# Clean build
cd android
./gradlew clean
cd ..

# Build Android
yarn android

# Verify build succeeds
# Test on emulator/device
```

**Checkpoint**: Android build succeeds and app runs.

#### Test 5.6.2: iOS Build
```bash
cd apps/mobile

# Clean build
cd ios
pod install
cd ..

# Build iOS
yarn ios

# Verify build succeeds
# Test on simulator/device
```

**Checkpoint**: iOS build succeeds and app runs.

### Step 5.7: Regression Testing

#### Critical Paths to Test:
1. ✅ Account creation (all types)
2. ✅ Account import (all types)
3. ✅ Transaction building
4. ✅ Transaction signing
5. ✅ Wallet syncing
6. ✅ Address generation
7. ✅ PSBT operations
8. ✅ Descriptor operations
9. ✅ Key management
10. ✅ Blockchain backends

**Checkpoint**: All critical paths tested and working.

## Phase 6: Code Review & Cleanup (Day 3, Morning - 2-3 hours)

### Step 6.1: Code Review
```bash
# Review all changes
git diff backup/pre-bdk-rn-migration-* --stat

# Review specific files
git diff backup/pre-bdk-rn-migration-* apps/mobile/api/bdk.ts

# Check for any TODO comments
grep -r "TODO.*bdk\|FIXME.*bdk" apps/mobile
```

**Action**: Review all changes, ensure code quality.

### Step 6.2: Remove Workarounds
```bash
# Check for any workarounds that might no longer be needed
grep -r "workaround\|hack\|temporary" apps/mobile/api/bdk.ts

# Review comments about limitations
grep -r "BDK doesn't support\|Since BDK" apps/mobile
```

**Action**: Remove or update workarounds if official package supports features.

### Step 6.3: Update Comments
```bash
# Update package references in comments
# Before:
// Using bdk-rn fork from LtbLightning

# After:
// Using official bdk-rn from bitcoindevkit
```

**Checkpoint**: Code reviewed and cleaned up.

### Step 6.4: Update Documentation
```bash
# Update README.md
# Update package.json description if needed
# Update any migration notes
```

**Files to update**:
- `README.md
- `apps/docs/pages/getting-started/dependencies.mdx`
- Any other documentation referencing the package

**Checkpoint**: Documentation updated.

## Phase 7: Final Validation (Day 3, Afternoon - 2-3 hours)

### Step 7.1: Full Test Suite
```bash
cd apps/mobile

# Run all tests
yarn test

# Verify all pass
echo $?  # Should be 0
```

**Checkpoint**: All tests passing.

### Step 7.2: Linting
```bash
cd apps/mobile

# Run linter
yarn lint

# Fix any issues
yarn lint:fix
```

**Checkpoint**: Code passes linting.

### Step 7.3: Type Check
```bash
cd apps/mobile

# Final type check
yarn type-check

# Should be clean
```

**Checkpoint**: TypeScript compilation clean.

### Step 7.4: Build Verification
```bash
# Android
yarn android --no-build-cache

# iOS
yarn ios --no-build-cache
```

**Checkpoint**: Both platforms build successfully.

### Step 7.5: Performance Check
```bash
# Compare bundle sizes
# Before migration (from backup branch)
git checkout backup/pre-bdk-rn-migration-*
cd apps/mobile && yarn && du -sh node_modules/bdk-rn

# After migration
git checkout feature/migrate-to-official-bdk-rn
cd apps/mobile && yarn && du -sh node_modules/bdk-rn

# Compare
```

**Checkpoint**: Performance acceptable.

## Phase 8: Commit & Prepare for Merge (Day 3, Evening - 1 hour)

### Step 8.1: Stage Changes
```bash
# Review what will be committed
git status

# Stage all changes
git add .

# Review staged changes
git diff --cached --stat
```

**Checkpoint**: Changes reviewed and staged.

### Step 8.2: Create Commit
```bash
# Create comprehensive commit message
git commit -m "feat: migrate from LtbLightning/bdk-rn fork to official bitcoindevkit/bdk-rn

- Replace fork with official bdk-rn package
- Update all import paths (verified compatible)
- Fix type definitions and enum references
- Update 35+ files using bdk-rn
- All tests passing
- Android and iOS builds verified

Breaking changes: None (API compatible)
Migration effort: 3 days
Risk: Low to Medium

Closes #[issue-number]"
```

**Checkpoint**: Changes committed.

### Step 8.3: Push to Remote
```bash
# Push bdk-rn branch with migration changes
git push origin bdk-rn

# Verify on remote
git ls-remote origin bdk-rn
```

**Checkpoint**: Branch pushed to remote.

### Step 8.4: Create Pull Request
```bash
# Create PR description
cat > PR_DESCRIPTION.md << EOF
# Migrate to Official BDK-RN Package

## Summary
Migrate from \`LtbLightning/bdk-rn\` fork to official \`bitcoindevkit/bdk-rn\` package.

## Changes
- Updated package dependency
- Verified all API compatibility (96.5% compatible)
- Updated import paths (3 paths verified)
- Fixed type definitions
- Updated 35+ files

## Testing
- ✅ All unit tests passing
- ✅ All integration tests passing
- ✅ TypeScript compilation clean
- ✅ Android build successful
- ✅ iOS build successful
- ✅ Manual testing of critical paths

## Migration Notes
See BDK_RN_MIGRATION_FINDINGS.md for detailed analysis.

## Risk Assessment
- Risk: Low to Medium
- Confidence: High (85-90%)
- Breaking Changes: None identified

## Checklist
- [x] Code updated
- [x] Tests passing
- [x] Builds successful
- [x] Documentation updated
- [ ] Code review completed
- [ ] QA testing completed
EOF
```

**Checkpoint**: PR ready for review.

## Phase 9: Rollback Plan (If Needed)

### Step 9.1: Identify Rollback Triggers
- Critical bugs discovered
- Performance degradation
- Breaking changes found
- Test failures

### Step 9.2: Rollback Procedure
```bash
# If rollback needed:
git checkout backup/pre-bdk-rn-migration-*

# Restore package.json
git checkout backup/pre-bdk-rn-migration-* -- apps/mobile/package.json

# Restore yarn.lock
git checkout backup/pre-bdk-rn-migration-* -- apps/mobile/yarn.lock

# Reinstall old package
cd apps/mobile
yarn install

# Verify
yarn test:unit
```

**Checkpoint**: Rollback procedure documented and tested.

## Phase 10: Post-Migration (Day 4-5)

### Step 10.1: Monitor Production
- [ ] Watch for errors in production
- [ ] Monitor performance metrics
- [ ] Check user feedback
- [ ] Review crash reports

### Step 10.2: Explore New Features
- [ ] Review BDK_RN_NEW_FEATURES.md
- [ ] Test enhanced coin selection
- [ ] Test advanced fee estimation
- [ ] Explore new database options

### Step 10.3: Update Documentation
- [ ] Update developer docs
- [ ] Update migration notes
- [ ] Document any new features used

## Troubleshooting Guide

### Issue: Type Errors After Installation
**Solution**:
1. Check import paths match package structure
2. Verify TypeScript definitions exist
3. Check enum values haven't changed
4. Review error messages for specific issues

### Issue: Runtime Errors
**Solution**:
1. Check method signatures haven't changed
2. Verify return types match expectations
3. Check for async/await patterns
4. Review console logs for specific errors

### Issue: Build Failures
**Solution**:
1. Clean build cache
2. Reinstall node_modules
3. Check native module linking
4. Verify platform-specific builds

### Issue: Test Failures
**Solution**:
1. Review test output for specific failures
2. Check if API behavior changed
3. Update test mocks if needed
4. Verify test data is still valid

## Success Criteria

### Must Have (Blocking)
- [ ] TypeScript compiles without errors
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Android build succeeds
- [ ] iOS build succeeds
- [ ] Critical wallet operations work
- [ ] No runtime errors in test scenarios

### Should Have (Important)
- [ ] Performance is acceptable
- [ ] Bundle size is reasonable
- [ ] Code quality maintained
- [ ] Documentation updated

### Nice to Have (Optional)
- [ ] New features explored
- [ ] Performance improvements
- [ ] Code simplifications

## Timeline Summary

| Phase | Duration | Day |
|-------|----------|-----|
| Phase 1: Preparation | 2-3 hours | Day 1 Morning |
| Phase 2: Package Installation | 1-2 hours | Day 1 Afternoon |
| Phase 3: Type Checking & Fixes | 2-3 hours | Day 1 Evening |
| Phase 4: Code Updates | 3-4 hours | Day 2 Morning |
| Phase 5: Testing | 4-5 hours | Day 2 Afternoon |
| Phase 6: Code Review | 2-3 hours | Day 3 Morning |
| Phase 7: Final Validation | 2-3 hours | Day 3 Afternoon |
| Phase 8: Commit & PR | 1 hour | Day 3 Evening |
| **Total** | **17-24 hours** | **3 days** |

## Risk Mitigation

1. **Backup Branch**: Created before any changes
2. **Test Branch**: Isolated migration branch
3. **Incremental Testing**: Test after each phase
4. **Rollback Plan**: Documented procedure
5. **Code Review**: Peer review before merge
6. **Staged Rollout**: Consider beta testing first

## Sign-off Checklist

Before merging:
- [ ] All phases completed
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] PR approved
- [ ] Rollback plan ready
- [ ] Team notified

## Notes

- Keep this document updated as migration progresses
- Document any deviations from plan
- Note any issues encountered and solutions
- Update timeline if needed

---

**Last Updated**: [Date]  
**Status**: [In Progress/Completed]  
**Owner**: [Name]
