import { Fragment, useMemo, useState } from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'

import SSHStack from '@/layouts/SSHStack'
import SSVStack from '@/layouts/SSVStack'
import { t } from '@/locales'
import { Colors } from '@/styles'
import { TxDecoded, type TxDecodedField, TxField } from '@/utils/txDecoded'

import SSText from './SSText'

const TEXT_SIZES = ['xxs', 'xs', 'sm', 'md', 'lg', 'xl'] as const
type TextSize = (typeof TEXT_SIZES)[number]

function byteChunks(hex: string) {
  const chunk = []
  for (let i = 0; i < hex.length; i += 2) {
    chunk.push([hex[i] + hex[i + 1]])
  }
  return chunk
}

type SSTranssctionDecodedProps = {
  txHex: string
}

function SSTransactionDecoded({ txHex }: SSTranssctionDecodedProps) {
  const decoded = useMemo(() => TxDecoded.decodeFromHex(txHex), [txHex])
  const [selectedItem, setSelectedItem] = useState(0)
  const [textSize, setTextSize] = useState<TextSize>('md')

  const handleZoomIn = () => {
    const currentIndex = TEXT_SIZES.indexOf(textSize)
    if (currentIndex < TEXT_SIZES.length - 1) {
      setTextSize(TEXT_SIZES[currentIndex + 1])
    }
  }

  const handleZoomOut = () => {
    const currentIndex = TEXT_SIZES.indexOf(textSize)
    if (currentIndex > 0) {
      setTextSize(TEXT_SIZES[currentIndex - 1])
    }
  }

  const colors: Record<TxField, string> = {
    [TxField.Version]: '#fff',
    [TxField.Marker]: '#888',
    [TxField.Flag]: '#fff',
    [TxField.TxInVarInt]: '#888',
    [TxField.TxInHash]: '#E01919',
    [TxField.TxInIndex]: '#860B0B',
    [TxField.TxInScriptVarInt]: '#DD9595',
    [TxField.TxInScript]: '#860B0B',
    [TxField.TxInSequence]: '#860B0B',
    [TxField.TxOutVarInt]: '#aaa',
    [TxField.TxOutValue]: '#07BC03',
    [TxField.TxOutScriptVarInt]: '#93CC92',
    [TxField.TxOutScript]: '#C13939',
    [TxField.WitnessVarInt]: '#fff',
    [TxField.WitnessItemsVarInt]: '#888',
    [TxField.WitnessItem]: '#555',
    [TxField.WitnessItemEmpty]: '#694040',
    [TxField.WitnessItemPubkey]: '#C13939',
    [TxField.WitnessItemSignature]: '#8F5252',
    [TxField.WitnessItemScript]: '#694040',
    [TxField.Locktime]: '#eee',
    [TxField.TxOutScriptStandard]: '#608A64',
    [TxField.TxOutScriptNonStandard]: '#608A64'
  }

  return (
    <SSVStack gap="md">
      <SSHStack gap="md" style={{ marginTop: -30, justifyContent: 'flex-end' }}>
        <TouchableOpacity
          onPress={handleZoomOut}
          disabled={textSize === TEXT_SIZES[0]}
          style={{ opacity: textSize === TEXT_SIZES[0] ? 0.5 : 1 }}
        >
          <SSText size="xl">-</SSText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleZoomIn}
          disabled={textSize === TEXT_SIZES[TEXT_SIZES.length - 1]}
          style={{
            opacity: textSize === TEXT_SIZES[TEXT_SIZES.length - 1] ? 0.5 : 1
          }}
        >
          <SSText size="xl">+</SSText>
        </TouchableOpacity>
      </SSHStack>
      <SSHStack style={{ flexWrap: 'wrap' }} gap="none">
        {decoded.map((item, i) => {
          return (
            <Fragment key={i}>
              {byteChunks(item.hex).map((byte, j) => {
                const selected = selectedItem === i
                return (
                  <TouchableOpacity
                    key={`${i}_${j}`}
                    onPress={() => setSelectedItem(selectedItem === i ? -1 : i)}
                  >
                    <SSText
                      type="mono"
                      size={textSize}
                      style={
                        selected
                          ? [
                              {
                                backgroundColor: 'white',
                                color: 'black',
                                padding: 2.6,
                                marginBottom: -1
                              }
                            ]
                          : [
                              {
                                color: colors[item.field as TxField],
                                padding: 2.6,
                                marginBottom: -1
                              }
                            ]
                      }
                    >
                      {byte}
                    </SSText>
                  </TouchableOpacity>
                )
              })}
            </Fragment>
          )
        })}
      </SSHStack>
      {selectedItem !== -1 && <SSTxDecodedField {...decoded[selectedItem]} />}
    </SSVStack>
  )
}

function SSTxDecodedField({ field, value, placeholders }: TxDecodedField) {
  return (
    <SSVStack gap="xs">
      <SSText size="lg" weight="bold">
        {t(`transaction.decoded.label.${field}`, { ...placeholders })}
      </SSText>

      <SSText color="muted">
        {t(`transaction.decoded.description.${field}`, { ...placeholders })}
      </SSText>
      <SSText type="mono">{value}</SSText>
    </SSVStack>
  )
}

export default SSTransactionDecoded
