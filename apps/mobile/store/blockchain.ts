import { type Blockchain } from 'bdk-rn'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { getBlockchain } from '@/api/bdk'
import {
  DEFAULT_RETRIES,
  DEFAULT_STOP_GAP,
  DEFAULT_TIME_OUT,
  getBlockchainConfig,
  MEMPOOL_SIGNET_URL
} from '@/config/servers'
import mmkvStorage from '@/storage/mmkv'
import { type Backend, type Network } from '@/types/settings/blockchain'

type BlockchainState = {
  backend: Backend
  network: Network
  url: string
  timeout: number
  retries: number
  stopGap: number
  connectionMode: 'auto' | 'manual'
  connectionTestInterval: number
}

type BlockchainAction = {
  setBackend: (backend: Backend) => void
  setConnectionMode: (mode: BlockchainState['connectionMode']) => void
  setConnectionTestInterval: (interval: number) => void
  setNetwork: (network: Network) => void
  setUrl: (url: string) => void
  setTimeout: (timeout: number) => void
  setStopGap: (stopGap: number) => void
  setRetries: (retries: number) => void
  getBlockchain: () => Promise<Blockchain>
  getBlockchainHeight: () => Promise<number>
}

const useBlockchainStore = create<BlockchainState & BlockchainAction>()(
  persist(
    (set, get) => ({
      backend: 'electrum',
      network: 'signet',
      url: MEMPOOL_SIGNET_URL,
      timeout: DEFAULT_TIME_OUT,
      retries: DEFAULT_RETRIES,
      stopGap: DEFAULT_STOP_GAP,
      connectionMode: 'auto',
      connectionTestInterval: 60,
      setBackend: (backend) => {
        set({ backend })
      },
      setConnectionMode: (connectionMode) => {
        set({ connectionMode })
      },
      setConnectionTestInterval: (connectionTestInterval) => {
        set({ connectionTestInterval })
      },
      setNetwork: (network) => {
        set({ network })
      },
      setUrl: (url) => {
        set({ url })
      },
      setTimeout: (timeout) => {
        set({ timeout })
      },
      setStopGap: (stopGap) => {
        set({ stopGap })
      },
      setRetries: (retries) => {
        set({ retries })
      },
      getBlockchain: async () => {
        const { backend, retries, stopGap, timeout, url } = get()
        const opts = { retries, stopGap, timeout }
        const config = getBlockchainConfig(backend, url, opts)
        return getBlockchain(backend, config)
      },
      getBlockchainHeight: async () => {
        return (await get().getBlockchain()).getHeight()
      }
    }),
    {
      name: 'satsigner-blockchain',
      storage: createJSONStorage(() => mmkvStorage)
    }
  )
)

export { useBlockchainStore }
