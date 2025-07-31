import { Stack, useLocalSearchParams } from 'expo-router'
import SSUnifiedImport from '@/components/SSUnifiedImport'
import SSText from '@/components/SSText'
import SSMainLayout from '@/layouts/SSMainLayout'
import { t } from '@/locales'
import { type ImportDescriptorSearchParams } from '@/types/navigation/searchParams'

export default function ImportExtendedPub() {
  const { keyIndex } = useLocalSearchParams<ImportDescriptorSearchParams>()

  return (
    <SSMainLayout>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <SSText uppercase>{t('account.import.xpub')}</SSText>
          )
        }}
      />
      <SSUnifiedImport
        importType="extendedPub"
        onConfirm={async (data) => {
          // This will be handled by the unified import component
          // The actual logic is now in the unified route
        }}
        loading={false}
      />
    </SSMainLayout>
  )
}
