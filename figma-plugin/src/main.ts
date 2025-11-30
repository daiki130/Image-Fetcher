// Figma Plugin Main Code
import { showUI, on } from '@create-figma-plugin/utilities'

export default function () {
  // UIから変換済み画像を受け取る
  on('APPLY_IMAGE_DATA', async (data: { imageData: Uint8Array; isNewRect?: boolean; width?: number; height?: number }) => {
    if (data.isNewRect && data.width && data.height) {
      await createRectangleWithImageData(data.imageData, data.width, data.height)
    } else {
      await applyImageDataToSelection(data.imageData)
    }
  })

  showUI({ width: 320, height: 600 })
}

// 選択ノードに画像データを適用
async function applyImageDataToSelection(imageData: Uint8Array) {
  const selection = figma.currentPage.selection
  
  if (selection.length === 0) {
    figma.notify('ノードを選択してください', { error: true })
    return
  }
  
  try {
    let appliedCount = 0
    
    for (const node of selection) {
      if ('fills' in node && node.fills !== figma.mixed) {
        const imageHash = figma.createImage(imageData).hash
        
        node.fills = [{
          type: 'IMAGE',
          imageHash: imageHash,
          scaleMode: 'FILL'
        }]
        
        appliedCount++
      }
    }
    
    if (appliedCount > 0) {
      figma.notify(`${appliedCount}個のノードに画像を適用しました`)
    } else {
      figma.notify('画像を適用できるノードがありませんでした', { error: true })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    figma.notify(`エラー: ${errorMessage}`, { error: true })
  }
}

// 新規レクタングルを作成して画像データを適用
async function createRectangleWithImageData(imageData: Uint8Array, width: number, height: number) {
  try {
    const rect = figma.createRectangle()
    
    // サイズを調整
    const maxSize = 1000
    let finalWidth = width
    let finalHeight = height
    
    if (width > maxSize || height > maxSize) {
      const ratio = width / height
      if (width > height) {
        finalWidth = maxSize
        finalHeight = maxSize / ratio
      } else {
        finalHeight = maxSize
        finalWidth = maxSize * ratio
      }
    }
    
    rect.resize(finalWidth, finalHeight)
    
    // 画像を適用
    const imageHash = figma.createImage(imageData).hash
    rect.fills = [{
      type: 'IMAGE',
      imageHash: imageHash,
      scaleMode: 'FILL'
    }]
    
    // ビューポートの中心に配置
    rect.x = figma.viewport.center.x - finalWidth / 2
    rect.y = figma.viewport.center.y - finalHeight / 2
    
    figma.currentPage.selection = [rect]
    figma.viewport.scrollAndZoomIntoView([rect])
    
    figma.notify('画像を配置しました')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    figma.notify(`エラー: ${errorMessage}`, { error: true })
  }
}