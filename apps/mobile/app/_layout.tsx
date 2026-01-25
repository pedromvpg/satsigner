import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Slot } from 'expo-router'
import { setStatusBarStyle } from 'expo-status-bar'
import * as SystemUI from 'expo-system-ui'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  Platform,
  StyleSheet,
  UIManager,
  View
} from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import NfcManager from 'react-native-nfc-manager'
import { toast, Toaster } from 'sonner-native'
import { useShallow } from 'zustand/react/shallow'

import { getItem } from '@/storage/encrypted'
import {
  getLastBackgroundTimestamp,
  setLastBackgroundTimestamp
} from '@/storage/mmkv'
import { useAuthStore } from '@/store/auth'
import { Colors } from '@/styles'

// Key for firstTime flag in SecureStore (must match auth.ts)
const FIRST_TIME_KEY = 'satsigner_first_time'

if (Platform.OS === 'android') {
  SystemUI.setBackgroundColorAsync(Colors.gray[950])

  if (UIManager.setLayoutAnimationEnabledExperimental)
    UIManager.setLayoutAnimationEnabledExperimental(true)
}

const queryClient = new QueryClient()

export default function RootLayout() {
  const [
    firstTime,
    setFirstTime,
    setLockTriggered,
    requiresAuth,
    lockDeltaTime
  ] = useAuthStore(
    useShallow((state) => [
      state.firstTime,
      state.setFirstTime,
      state.setLockTriggered,
      state.requiresAuth,
      state.lockDeltaTime
    ])
  )

  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const appState = useRef(AppState.currentState)

  // Check SecureStore on startup to sync firstTime state
  // This handles cases where MMKV storage isn't ready
  useEffect(() => {
    async function checkFirstTimeFromSecureStore() {
      try {
        const storedValue = await getItem(FIRST_TIME_KEY)
        if (storedValue === 'false' && firstTime) {
          // SecureStore says user has completed setup, but MMKV says firstTime
          // This means MMKV lost its state - sync from SecureStore
          await setFirstTime(false)
        }
      } catch {
        // Ignore errors - SecureStore might not have the key yet
      } finally {
        setIsCheckingAuth(false)
      }
    }
    checkFirstTimeFromSecureStore()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setTimeout(() => {
      setStatusBarStyle('light')
    }, 1)
  }, []) // Workaround for now to set the statusBarStyle

  useEffect(() => {
    if (!firstTime && !isCheckingAuth) setLockTriggered(true)

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChanged
    )

    return () => {
      subscription.remove()
    }
  }, [isCheckingAuth]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Initialize NFC manager
    NfcManager.start().catch(() => {
      // Show a toast notification only in development
      if (__DEV__) {
        toast.error('NFC initialization failed', {
          description:
            'This is expected in emulators and devices without NFC support'
        })
      }
    })
  }, [])

  function handleAppStateChanged(nextAppState: AppStateStatus) {
    if (nextAppState === 'background' && requiresAuth) {
      setLastBackgroundTimestamp(Date.now())
    } else if (
      nextAppState === 'active' &&
      appState.current.match(/background/) &&
      requiresAuth
    ) {
      const inactivityStartTime = getLastBackgroundTimestamp()
      const elapsed = (Date.now() - (inactivityStartTime || 0)) / 1000

      if (elapsed >= lockDeltaTime) setLockTriggered(true)
    }

    appState.current = nextAppState
  }

  // Show loading while checking auth state from SecureStore
  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={styles.container}>
        <Slot />
        <Toaster
          theme="dark"
          position="top-center"
          style={{
            borderRadius: 8,
            backgroundColor: Colors.gray[950],
            borderWidth: 1,
            borderColor: Colors.gray[800],
            zIndex: 999999
          }}
        />
      </GestureHandlerRootView>
    </QueryClientProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[950]
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray[950]
  }
})
