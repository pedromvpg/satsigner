import { Stack, useLocalSearchParams } from 'expo-router'
import SSUnifiedImport from '@/components/SSUnifiedImport'
import SSText from '@/components/SSText'
import SSMainLayout from '@/layouts/SSMainLayout'
import { t } from '@/locales'
import { type ImportDescriptorSearchParams } from '@/types/navigation/searchParams'

export default function ImportDescriptor() {
  const { keyIndex } = useLocalSearchParams<ImportDescriptorSearchParams>()

  return (
    <SSMainLayout>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <SSText uppercase>{t('account.import.descriptor')}</SSText>
          )
        }}
      />
      <SSUnifiedImport
        importType="descriptor"
        onConfirm={async (data) => {
          // This will be handled by the unified import component
          // The actual logic is now in the unified route
        }}
        loading={false}
        showScriptType={true}
      />
    </SSMainLayout>
  )
}
