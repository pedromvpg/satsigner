// Test script to check Electrum connection
// Run with: npx ts-node apps/mobile/test-electrum-connection.ts

import { Blockchain } from 'bdk-rn'
import {
  BlockChainNames,
  type BlockchainElectrumConfig
} from 'bdk-rn'

async function testElectrumConnection() {
  console.log('Testing Electrum connection...\n')

  // Test config matching what we use in the app
  const testConfig: BlockchainElectrumConfig = {
    url: 'ssl://bitcoin.lu.ke:50002',
    sock5: null,
    retry: 5,
    timeout: 5000, // 5 seconds in milliseconds
    stopGap: 20,
    validateDomain: false
  }

  console.log('Config:', JSON.stringify(testConfig, null, 2))
  console.log('\nAttempting to create blockchain...')

  try {
    const blockchain = await new Blockchain().create(
      testConfig,
      BlockChainNames.Electrum
    )
    console.log('✅ Blockchain created successfully!')
    console.log('Blockchain ID:', blockchain.id)

    // Try to get height
    try {
      const height = await blockchain.getHeight()
      console.log('✅ Got blockchain height:', height)
    } catch (error) {
      console.error('❌ Failed to get height:', error)
    }

    return true
  } catch (error) {
    console.error('❌ Failed to create blockchain:')
    console.error('Error:', error)
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }
    return false
  }
}

// Run the test
testElectrumConnection()
  .then((success) => {
    console.log('\n' + '='.repeat(50))
    if (success) {
      console.log('✅ Connection test PASSED')
    } else {
      console.log('❌ Connection test FAILED')
    }
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('Unexpected error:', error)
    process.exit(1)
  })
