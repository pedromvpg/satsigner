import { Canvas, Group } from '@shopify/react-native-skia'
import {
  sankey,
  type SankeyLinkMinimal,
  type SankeyNodeMinimal
} from 'd3-sankey'
import { useMemo } from 'react'
import { Platform, View } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import Animated from 'react-native-reanimated'

import { useGestures } from '@/hooks/useGestures'
import { useLayout } from '@/hooks/useLayout'

import { SSSankeyLinks } from './SSSankeyLinks'
import { SSSankeyNodes } from './SSSankeyNodes'

export interface Link extends SankeyLinkMinimal<object, object> {
  source: string
  target: string
  value: number
}

export interface Node extends SankeyNodeMinimal<object, object> {
  id: string
  depth?: number
  depthH: number
  address?: string
  type: string
  textInfo: string[]
  value?: number
  txId?: string
  nextTx?: string
}

const LINK_MAX_WIDTH = 160
const BLOCK_WIDTH = 50
const NODE_WIDTH = 98

type SSMultipleSankeyDiagramProps = {
  sankeyNodes: Node[]
  sankeyLinks: Link[]
}

function SSMultipleSankeyDiagram({
  sankeyNodes,
  sankeyLinks
}: SSMultipleSankeyDiagramProps) {
  const { width: w, height: h, center, onCanvasLayout } = useLayout()

  // Calculate the maximum depthH value across all nodes
  const maxDepthH = useMemo(() => {
    return sankeyNodes.reduce((max, node) => {
      return Math.max(max, node.depthH)
    }, 0)
  }, [sankeyNodes])

  // Calculate the maximum number of nodes at any depthH level
  const maxNodeCountInDepthH = useMemo(() => {
    const depthCounts = new Map<number, number>()

    sankeyNodes.forEach((node) => {
      const count = depthCounts.get(node.depthH) || 0
      depthCounts.set(node.depthH, count + 1)
    })

    return depthCounts.size > 0
      ? Math.max(...Array.from(depthCounts.values()))
      : 0
  }, [sankeyNodes])

  const sankeyGenerator = sankey()
    .nodeWidth(NODE_WIDTH)
    .nodePadding(140)
    .extent([
      [0, 160],
      [
        2000 * (maxDepthH / 11),
        // 2000 * 0.7,
        1000 * (maxNodeCountInDepthH / 9)
      ]
    ])
    .nodeId((node: SankeyNodeMinimal<object, object>) => (node as Node).id)

  sankeyGenerator.nodeAlign((node: SankeyNodeMinimal<object, object>) => {
    const { depthH } = node as Node
    return depthH ?? 0
  })

  const { nodes, links } = sankeyGenerator({
    nodes: sankeyNodes,
    links: sankeyLinks
  })

  // Transform SankeyLinkMinimal to Link type
  const transformedLinks = links.map((link) => ({
    source: (link.source as Node).id,
    target: (link.target as Node).id,
    value: link.value
  }))

  // Calculate the optimal initial x translation to show the last 3 depthH levels
  const initialXTranslation = useMemo(() => {
    // If we have fewer than 3 depthH levels or no nodes, show from the beginning
    if (maxDepthH < 2 || !nodes.length) {
      return 0
    }

    // Find the x position of nodes in the last 3 depthH levels
    const lastThreeLevels = [maxDepthH, maxDepthH - 1, maxDepthH - 2].filter(
      (level) => level >= 0
    )

    // Find the minimum and maximum x positions among nodes in the last three levels
    let minX = Infinity
    let maxX = -Infinity
    let nodesFound = false

    nodes.forEach((node) => {
      const typedNode = node as Node
      if (
        lastThreeLevels.includes(typedNode.depthH) &&
        (node as any).x !== undefined
      ) {
        minX = Math.min(minX, (node as any).x)
        maxX = Math.max(maxX, (node as any).x)
        nodesFound = true
      }
    })

    // If we couldn't find any nodes in the last three levels, use a fallback
    if (!nodesFound) {
      // Fallback to a calculation based on the diagram's expected layout
      const diagramWidth = 2000 * (maxDepthH / 11)
      const lastThreeDepthsWidth = diagramWidth * (3 / maxDepthH)
      const fallbackTranslation = -(
        diagramWidth -
        lastThreeDepthsWidth -
        w / 10
      )

      // Ensure the translation is within reasonable bounds
      return Math.max(fallbackTranslation, -(diagramWidth - w / 2))
    }

    // Calculate the width of the last three levels
    const lastThreeLevelsWidth = maxX - minX + NODE_WIDTH

    // If the width of the last three levels is less than the viewport width,
    // center them in the viewport
    if (lastThreeLevelsWidth < w) {
      return -(minX - (w - lastThreeLevelsWidth) / 2)
    }

    // Otherwise, show from the minimum x position with a small offset
    const translation = -(minX - w / 10)

    // Calculate the total diagram width (approximation)
    const diagramWidth = 2000 * (maxDepthH / 11)

    // Ensure the translation doesn't move the diagram too far off-screen
    // This prevents extreme translations that might make the diagram invisible
    return Math.max(translation, -(diagramWidth - w / 2))
  }, [maxDepthH, nodes, w])

  const { animatedStyle, gestures, transform } = useGestures({
    width: w,
    height: h,
    center,
    isDoubleTapEnabled: true,
    maxPanPointers: Platform.OS === 'ios' ? 2 : 1,
    minPanPointers: 1,
    maxScale: 10,
    minScale: 0.2,
    shouldResetOnInteractionEnd: false,
    initialTranslation: {
      x: initialXTranslation,
      y: 0
    }
  })

  if (!nodes?.length || !transformedLinks?.length) {
    return null
  }
  return (
    <View style={{ flex: 1 }}>
      <Canvas style={{ width: 2000, height: 2000 }} onLayout={onCanvasLayout}>
        <Group transform={transform} origin={{ x: w / 2, y: h / 2 }}>
          <SSSankeyLinks
            links={transformedLinks}
            nodes={nodes as Node[]}
            sankeyGenerator={sankeyGenerator}
            LINK_MAX_WIDTH={LINK_MAX_WIDTH}
            BLOCK_WIDTH={BLOCK_WIDTH}
          />
          <SSSankeyNodes nodes={nodes} sankeyGenerator={sankeyGenerator} />
        </Group>
      </Canvas>
      <GestureDetector gesture={gestures}>
        <View
          style={{
            flex: 1,
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          }}
        >
          <Animated.View
            style={[{ width: 2000, height: 2000 }, animatedStyle]}
            onLayout={onCanvasLayout}
          />
        </View>
      </GestureDetector>
    </View>
  )
}

export default SSMultipleSankeyDiagram
