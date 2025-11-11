import { render, Button, Container, Text, VerticalSpace, Textbox, TextboxMultiline } from '@create-figma-plugin/ui'
import { emit } from '@create-figma-plugin/utilities'
import { h, Fragment } from 'preact'
import { useState } from 'preact/hooks'

interface ImageData {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  id?: string
  type?: string
  base64?: string
}

function Plugin() {
  const [jsonInput, setJsonInput] = useState('')
  const [images, setImages] = useState<ImageData[]>([])
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [status, setStatus] = useState('')
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info')

  // データ読み込み
  const handleLoadData = () => {
    if (!jsonInput.trim()) {
      showStatus('JSONデータを入力してください', 'error')
      return
    }

    try {
      const parsed = JSON.parse(jsonInput)
      
      if (!Array.isArray(parsed) || parsed.length === 0) {
        showStatus('有効な画像配列を入力してください', 'error')
        return
      }

      setImages(parsed)
      showStatus(`${parsed.length}個の画像を読み込みました`, 'success')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー'
      showStatus(`JSONパースエラー: ${errorMessage}`, 'error')
    }
  }

  // 画像選択
  const handleSelectImage = (index: number) => {
    setSelectedImageIndex(index)
  }

  // 選択ノードに適用
  const handleApplyImage = async () => {
    if (selectedImageIndex === null) {
      showStatus('画像を選択してください', 'error')
      return
    }

    const selectedImage = images[selectedImageIndex]
    
    const imageData = await downloadAndConvertImage(selectedImage)
    
    if (imageData) {
      emit('APPLY_IMAGE_DATA', { imageData })
      showStatus('画像を適用しました', 'success')
    } else {
      showStatus('画像の処理に失敗しました。Chrome拡張機能で「選択画像をエクスポート」してください', 'error')
    }
  }

  // 新規レクタングル作成
  const handleCreateRectangle = async () => {
    if (selectedImageIndex === null) {
      showStatus('画像を選択してください', 'error')
      return
    }

    const selectedImage = images[selectedImageIndex]
    
    const imageData = await downloadAndConvertImage(selectedImage)
    
    if (imageData) {
      emit('APPLY_IMAGE_DATA', {
        imageData,
        isNewRect: true,
        width: selectedImage.width,
        height: selectedImage.height
      })
      showStatus('レクタングルを作成しました', 'success')
    } else {
      showStatus('画像の処理に失敗しました。Chrome拡張機能で「選択画像をエクスポート」してください', 'error')
    }
  }

  // 画像をダウンロードして変換
  const downloadAndConvertImage = async (image: ImageData): Promise<Uint8Array | null> => {
    try {
      let blob: Blob
      
      // base64データがある場合はそれを優先的に使用(CORS回避)
      if (image.base64) {
        showStatus('base64データを変換中...', 'info')
        const base64Data = image.base64.split(',')[1]
        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const mimeType = image.base64.split(',')[0].match(/:(.*?);/)?.[1] || 'image/png'
        blob = new Blob([bytes], { type: mimeType })
      } else {
        // base64がない場合は直接fetch
        showStatus('画像をダウンロード中...', 'info')
        const response = await fetch(image.src)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        blob = await response.blob()
      }
      
      // WebPの場合はPNGに変換
      if (image.src.toLowerCase().includes('.webp') || blob.type === 'image/webp') {
        showStatus('WebPをPNGに変換中...', 'info')
        return await convertWebPToPNG(blob)
      }
      
      // そのまま返す
      const arrayBuffer = await blob.arrayBuffer()
      return new Uint8Array(arrayBuffer)
    } catch (error) {
      console.error('Download error:', error)
      const errorMessage = error instanceof Error ? error.message : '不明なエラー'
      showStatus(`エラー: ${errorMessage}`, 'error')
      return null
    }
  }

  // WebPをPNGに変換
  const convertWebPToPNG = async (blob: Blob): Promise<Uint8Array | null> => {
    try {
      const imageUrl = URL.createObjectURL(blob)
      
      // Imageオブジェクトで読み込み
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl
      })
      
      // Canvasで描画してPNGに変換
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Canvas context not available')
      }
      
      ctx.drawImage(img, 0, 0)
      
      // PNGとして取得
      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to convert to PNG'))
          }
        }, 'image/png')
      })
      
      // Uint8Arrayに変換
      const pngArrayBuffer = await pngBlob.arrayBuffer()
      const pngUint8Array = new Uint8Array(pngArrayBuffer)
      
      // クリーンアップ
      URL.revokeObjectURL(imageUrl)
      
      return pngUint8Array
    } catch (error) {
      console.error('Conversion error:', error)
      return null
    }
  }

  // ステータス表示
  const showStatus = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setStatus(message)
    setStatusType(type)
  }

  return (
    <Container space="medium">
      <VerticalSpace space="small" />
      
      <div style={{ 
        padding: '12px', 
        background: '#f9f9f9', 
        borderRadius: '4px',
        fontSize: '11px',
        lineHeight: '1.6'
      }}>
        <strong>使い方:</strong>
        <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Chrome拡張機能で画像を収集</li>
          <li>「クリップボードにコピー」をクリック</li>
          <li>下のテキストエリアに貼り付け</li>
          <li>「データを読み込む」をクリック</li>
          <li>画像を選択してFigmaに適用</li>
        </ol>
      </div>

      <VerticalSpace space="medium" />

      <Text>画像データ(JSON):</Text>
      <VerticalSpace space="extraSmall" />
      <TextboxMultiline
        value={jsonInput}
        onValueInput={setJsonInput}
        placeholder='[{"src": "https://...", "width": 1920, "height": 1080}, ...]'
        rows={6}
      />

      <VerticalSpace space="small" />
      <Button fullWidth onClick={handleLoadData}>
        データを読み込む
      </Button>

      {images.length > 0 && (
        <>
          <VerticalSpace space="medium" />
          <Text>
            <strong>{images.length}個の画像</strong>
          </Text>
          <VerticalSpace space="extraSmall" />
          
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            border: '1px solid #e0e0e0',
            borderRadius: '4px'
          }}>
            {images.map((img, index) => (
              <div
                key={index}
                onClick={() => handleSelectImage(index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px',
                  borderBottom: index < images.length - 1 ? '1px solid #f0f0f0' : 'none',
                  cursor: 'pointer',
                  background: selectedImageIndex === index ? '#e3f2fd' : 'transparent',
                  borderLeft: selectedImageIndex === index ? '3px solid #18A0FB' : '3px solid transparent'
                }}
              >
                <img
                  src={img.src}
                  alt={img.alt || `Image ${index + 1}`}
                  style={{
                    width: '40px',
                    height: '40px',
                    objectFit: 'cover',
                    marginRight: '8px',
                    borderRadius: '3px'
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '11px' }}>
                    <strong>{index + 1}.</strong> {img.alt || 'No title'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    {img.width} × {img.height}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <VerticalSpace space="small" />
          <Button 
            fullWidth 
            onClick={handleApplyImage}
            disabled={selectedImageIndex === null}
          >
            選択ノードに画像を適用
          </Button>
          
          <VerticalSpace space="extraSmall" />
          <Button 
            fullWidth 
            secondary
            onClick={handleCreateRectangle}
            disabled={selectedImageIndex === null}
          >
            新規レクタングルを作成
          </Button>
        </>
      )}

      {status && (
        <>
          <VerticalSpace space="small" />
          <div style={{
            padding: '8px',
            background: statusType === 'error' ? '#ffe0e0' : statusType === 'success' ? '#e0f5e0' : '#f5f5f5',
            color: statusType === 'error' ? '#d32f2f' : statusType === 'success' ? '#388e3c' : '#333',
            borderRadius: '4px',
            fontSize: '11px'
          }}>
            {status}
          </div>
        </>
      )}
    </Container>
  )
}

export default render(Plugin)