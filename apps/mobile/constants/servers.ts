import type { Server } from '@/types/settings/blockchain'

export const servers: Server[] = [
  {
    name: 'Mempool',
    backend: 'esplora',
    url: 'https://mempool.space/api',
    network: 'bitcoin'
  },
  {
    name: 'Blockstream',
    backend: 'electrum',
    url: 'ssl://blockstream.info:700',
    network: 'bitcoin'
  },
  {
    name: 'Blockstream',
    backend: 'electrum',
    url: 'ssl://electrum.blockstream.info:50002',
    network: 'bitcoin'
  },
  {
    name: 'Luke',
    backend: 'electrum',
    url: 'ssl://bitcoin.lu.ke:50002',
    network: 'bitcoin'
  },
  {
    name: 'Emzy',
    backend: 'electrum',
    url: 'ssl://electrum.emzy.de:50002',
    network: 'bitcoin'
  },
  {
    name: 'Bitaroo',
    backend: 'electrum',
    url: 'ssl://electrum.bitaroo.net:50002',
    network: 'bitcoin'
  },
  {
    name: 'DIY Nodes',
    backend: 'electrum',
    url: 'ssl://electrum.diynodes.com:50022',
    network: 'bitcoin'
  },
  {
    name: 'Seth For Privacy',
    backend: 'electrum',
    url: 'ssl://fulcrum.sethforprivacy.com:50002',
    network: 'bitcoin'
  },
  // SIGNET
  {
    name: 'Mempool',
    backend: 'electrum',
    network: 'signet',
    url: 'ssl://mempool.space:60602'
  },
  {
    name: 'Mempool',
    backend: 'esplora',
    network: 'signet',
    url: 'https://mempool.space/signet/api'
  },
  {
    name: 'Blockstream',
    backend: 'esplora',
    network: 'signet',
    url: 'https://blockstream.info/signet/api'
  },
  {
    name: 'Blockstream',
    backend: 'electrum',
    network: 'signet',
    url: 'ssl://electrum.blockstream.info:60002'
  },
  // TESTNET
  {
    name: 'Mempool',
    backend: 'esplora',
    network: 'testnet',
    url: 'https://mempool.space/testnet4/api'
  },
  {
    name: 'Blockstream',
    backend: 'esplora',
    network: 'testnet',
    url: 'https://blockstream.info/testnet/api'
  },
  {
    name: 'Mutinynet',
    backend: 'esplora',
    network: 'testnet',
    url: 'https://mutinynet.com/api'
  }
]
