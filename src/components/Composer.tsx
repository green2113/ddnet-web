import { useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onAddAttachment?: (file: File) => void
  onRemoveAttachment?: (id: string) => void
  uploading?: boolean
  attachments?: Array<{ id: string; name: string; isImage: boolean; previewUrl?: string }>
  disabled?: boolean
  channelName: string
  t: {
    composer: {
      placeholderLogin: string
      placeholderMessage: string
      placeholderMessageWithChannel: string
      send: string
    }
  }
}

export default function Composer({
  value,
  onChange,
  onSend,
  onAddAttachment,
  onRemoveAttachment,
  uploading = false,
  attachments = [],
  disabled = false,
  channelName,
  t,
}: Props) {
  const isEnabled = !disabled && (value.trim().length > 0 || attachments.length > 0)
  const [isEmpty, setIsEmpty] = useState(value.length === 0)
  const placeholder = disabled
    ? t.composer.placeholderLogin
    : t.composer.placeholderMessageWithChannel.replace('{channel}', channelName || 'general')
  const editorRef = useRef<HTMLDivElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const isComposingRef = useRef(false)
  const maxEditorHeight = 180

  const escapeHtml = (input: string) =>
    input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const highlightedHtml = useMemo(() => {
    const zeroWidthChar = '\uFEFF'
    const buildLeaf = (text: string, className?: string) => {
      const classAttr = className ? ` class="${className}"` : ''
      return `<span data-slate-leaf="true"${classAttr}>${escapeHtml(text)}</span>`
    }
    const buildEmptyLeaf = () =>
      `<span data-slate-leaf="true" class="empty-text"><span data-slate-zero-width="n" data-slate-length="0">${zeroWidthChar}<br></span></span>`
    const wrapBlock = (inner: string) =>
      `<div data-slate-node="element"><span data-slate-node="text">${inner}</span></div>`

    const renderLine = (line: string) => {
      if (line.length === 0) return buildEmptyLeaf()
      const parts = line.split(/(https?:\/\/\S{2,})/g)
      return parts
        .map((part) => {
          if (/^https?:\/\/\S{2,}$/.test(part)) {
            return buildLeaf(part, 'link')
          }
          return buildLeaf(part)
        })
        .join('')
    }

    const lines = value.split('\n')
    if (lines.length === 0) lines.push('')
    return lines.map((line) => wrapBlock(renderLine(line))).join('')
  }, [value])

  const hasUrl = useMemo(() => /https?:\/\/\S{2,}/.test(value), [value])

  const plainHtml = useMemo(() => {
    const zeroWidthChar = '\uFEFF'
    const buildLeaf = (text: string) => `<span data-slate-leaf="true">${escapeHtml(text)}</span>`
    const buildEmptyLeaf = () =>
      `<span data-slate-leaf="true" class="empty-text"><span data-slate-zero-width="n" data-slate-length="0">${zeroWidthChar}<br></span></span>`
    const wrapBlock = (inner: string) =>
      `<div data-slate-node="element"><span data-slate-node="text">${inner}</span></div>`

    const lines = value.split('\n')
    if (lines.length === 0) lines.push('')
    return lines.map((line) => wrapBlock(line.length === 0 ? buildEmptyLeaf() : buildLeaf(line))).join('')
  }, [value])

  const readEditorValue = () => {
    const editor = editorRef.current
    if (!editor) return ''
    const blocks = Array.from(editor.querySelectorAll<HTMLDivElement>('div[data-slate-node="element"]'))
    if (blocks.length === 0) return editor.textContent || ''
    return blocks
      .map((block) => (block.textContent || '').replace(/[\uFEFF\u200B]/g, ''))
      .join('\n')
  }

  const insertLineBreakBlock = () => {
    const editor = editorRef.current
    if (!editor) return
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    if (!editor.contains(range.startContainer)) return
    range.deleteContents()

    const block = document.createElement('div')
    block.setAttribute('data-slate-node', 'element')
    const textNode = document.createElement('span')
    textNode.setAttribute('data-slate-node', 'text')
    const leaf = document.createElement('span')
    leaf.setAttribute('data-slate-leaf', 'true')
    leaf.className = 'empty-text'
    const zeroWidth = document.createElement('span')
    zeroWidth.setAttribute('data-slate-zero-width', 'n')
    zeroWidth.setAttribute('data-slate-length', '0')
    zeroWidth.textContent = '\uFEFF'
    const br = document.createElement('br')
    zeroWidth.appendChild(br)
    leaf.appendChild(zeroWidth)
    textNode.appendChild(leaf)
    block.appendChild(textNode)

    const startElement = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as Element)
      : range.startContainer.parentElement
    const currentBlock = startElement?.closest('div[data-slate-node="element"]') || null
    if (currentBlock && currentBlock.parentNode === editor) {
      if (currentBlock.nextSibling) {
        editor.insertBefore(block, currentBlock.nextSibling)
      } else {
        editor.appendChild(block)
      }
    } else {
      editor.appendChild(block)
    }

    const nextRange = document.createRange()
    nextRange.setStart(leaf, 0)
    nextRange.collapse(true)
    selection.removeAllRanges()
    selection.addRange(nextRange)
  }

  const getSelectionOffset = () => {
    const editor = editorRef.current
    if (!editor) return null
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return null
    const range = selection.getRangeAt(0)
    if (!editor.contains(range.startContainer)) return null
    const blocks = Array.from(editor.querySelectorAll<HTMLDivElement>('div[data-slate-node="element"]'))
    if (blocks.length === 0) {
      const preRange = range.cloneRange()
      preRange.selectNodeContents(editor)
      preRange.setEnd(range.startContainer, range.startOffset)
      return preRange.toString().length
    }
    const startElement = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as Element)
      : range.startContainer.parentElement
    const currentBlock = startElement?.closest('div[data-slate-node="element"]') || null
    let offset = 0
    for (const block of blocks) {
      if (block === currentBlock) {
        const blockRange = range.cloneRange()
        blockRange.selectNodeContents(block)
        blockRange.setEnd(range.startContainer, range.startOffset)
        offset += blockRange.toString().length
        break
      }
      offset += (block.textContent || '').length + 1
    }
    return offset
  }

  const restoreSelection = (offset: number) => {
    const editor = editorRef.current
    if (!editor) return
    const selection = window.getSelection()
    if (!selection) return
    const blocks = Array.from(editor.querySelectorAll<HTMLDivElement>('div[data-slate-node="element"]'))
    if (blocks.length === 0) {
      selection.selectAllChildren(editor)
      selection.collapseToEnd()
      return
    }
    let remaining = offset
    for (let i = 0; i < blocks.length; i += 1) {
      const block = blocks[i]
      const blockLength = (block.textContent || '').length
      if (remaining <= blockLength) {
        const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null)
        let node = walker.nextNode()
        let localRemaining = remaining
        while (node) {
          const textLength = node.textContent?.length ?? 0
          if (localRemaining <= textLength) {
            const range = document.createRange()
            range.setStart(node, localRemaining)
            range.collapse(true)
            selection.removeAllRanges()
            selection.addRange(range)
            return
          }
          localRemaining -= textLength
          node = walker.nextNode()
        }
        const range = document.createRange()
        range.selectNodeContents(block)
        range.collapse(false)
        selection.removeAllRanges()
        selection.addRange(range)
        return
      }
      remaining -= blockLength
      if (remaining === 1) {
        const nextBlock = blocks[i + 1]
        if (nextBlock) {
          const range = document.createRange()
          range.selectNodeContents(nextBlock)
          range.collapse(true)
          selection.removeAllRanges()
          selection.addRange(range)
          return
        }
      }
      remaining -= 1
    }
    selection.selectAllChildren(editor)
    selection.collapseToEnd()
  }

  const adjustHeight = () => {
    if (typeof window === 'undefined') return
    const el = editorRef.current
    if (!el) return
    el.style.height = 'auto'
    const next = Math.min(el.scrollHeight, maxEditorHeight)
    el.style.height = `${Math.ceil(next)}px`
  }

  const syncEditorHtml = () => {
    const editor = editorRef.current
    if (!editor) return
    const desired = highlightedHtml || ''
    if (editor.innerHTML === desired) return
    const selectionOffset = getSelectionOffset()
    editor.innerHTML = desired
    if (selectionOffset !== null) {
      restoreSelection(selectionOffset)
    }
    const nextValue = readEditorValue()
    setIsEmpty(nextValue.length === 0)
  }

  useEffect(() => {
    if (isComposingRef.current) return
    if (hasUrl) {
      syncEditorHtml()
      adjustHeight()
      return
    }
    const editor = editorRef.current
    if (!editor) return
    const currentValue = readEditorValue()
    if (currentValue !== value) {
      const selectionOffset = getSelectionOffset()
      editor.innerHTML = plainHtml
      if (selectionOffset !== null) {
        restoreSelection(selectionOffset)
      }
    }
    setIsEmpty(value.length === 0)
    adjustHeight()
  }, [highlightedHtml, plainHtml, value, hasUrl])

  useEffect(() => {
    const target: EventTarget | null = typeof window === 'undefined' ? null : window
    if (!target) return
    const el = editorRef.current
    if (!el) return
    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => adjustHeight())
      observer.observe(el)
    } else {
      const onResize = () => adjustHeight()
      target.addEventListener('resize', onResize)
      return () => target.removeEventListener('resize', onResize)
    }
    return () => {
      observer?.disconnect()
    }
  }, [])

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (disabled) return
      if (event.defaultPrevented) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target) {
        const tag = target.tagName?.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || target.isContentEditable) return
      }
      if (!editorRef.current) return
      editorRef.current.focus()
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [disabled])

  return (
    <div id="composer" className="px-4 pb-4">
      <div className={`rounded-[10px] ${disabled ? 'cursor-not-allowed opacity-90' : ''}`} style={{ background: 'var(--input-bg)', color: 'var(--text-primary)' }}>
        {attachments.length > 0 ? (
          <div className="px-3 pt-3">
            <div className="flex flex-wrap gap-3">
            {attachments.map((item) => (
              <div key={item.id} className="relative w-48 h-48">
                <div
                  className="w-48 h-48 rounded-md overflow-hidden flex flex-col"
                  style={{ background: 'var(--input-bg)', border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  {item.isImage && item.previewUrl ? (
                    <div className="flex-1 flex items-center justify-center p-2">
                      <img src={item.previewUrl} alt={item.name} className="max-w-full max-h-full object-contain rounded-sm" />
                    </div>
                  ) : (
                    <div className="flex-1 grid place-items-center" style={{ color: 'var(--text-muted)' }}>
                      <span className="text-[11px]">FILE</span>
                    </div>
                  )}
                  <div className="px-2 py-1 text-[11px] truncate" style={{ color: 'var(--text-primary)' }}>
                    {item.name}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Remove attachment"
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full grid place-items-center cursor-pointer"
                  style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
                  onClick={() => onRemoveAttachment?.(item.id)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
            </div>
          </div>
        ) : null}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onAddAttachment?.(file)
              if (event.target) event.target.value = ''
            }}
            accept="image/*,application/pdf,text/plain,application/zip,application/x-zip-compressed"
            disabled={disabled || uploading}
          />
          <button
            type="button"
            aria-label="Attach file"
            disabled={disabled || uploading}
            onClick={() => fileRef.current?.click()}
            className={`p-2 rounded-md transition-colors ${disabled || uploading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            style={{ color: disabled || uploading ? '#9aa0a6' : 'var(--text-primary)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M21 12.5V17a4 4 0 0 1-8 0V7a3 3 0 1 1 6 0v9a2 2 0 1 1-4 0V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 12v5a4 4 0 0 0 8 0v-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="relative flex-1">
            {isEmpty ? (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  color: 'var(--text-muted)',
                  padding: '8px 12px',
                  fontSize: '15px',
                  lineHeight: '23px',
                }}
              >
                {placeholder}
              </div>
            ) : null}
            <div
              ref={editorRef}
              className={`${disabled ? 'cursor-not-allowed' : ''}`}
              contentEditable={!disabled}
              role="textbox"
              aria-label={placeholder}
              style={{
                minHeight: '36px',
                maxHeight: `${maxEditorHeight}px`,
                padding: '8px 12px',
                fontSize: '15px',
                lineHeight: '23px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                outline: 'none',
                overflow: 'hidden',
                color: 'var(--text-primary)',
                background: 'transparent',
              }}
              onCompositionStart={() => {
                isComposingRef.current = true
                setIsEmpty(false)
              }}
              onCompositionEnd={() => {
                isComposingRef.current = false
                if (!editorRef.current || disabled) return
                const nextValue = readEditorValue()
                if (nextValue !== value) {
                  onChange(nextValue)
                }
                setIsEmpty(nextValue.length === 0)
                adjustHeight()
              }}
              onInput={(event) => {
                if (!editorRef.current || disabled) return
                const nativeEvent = event.nativeEvent
                if ('isComposing' in nativeEvent && nativeEvent.isComposing) return
                if ('inputType' in nativeEvent && nativeEvent.inputType === 'insertLineBreak') {
                  event.preventDefault()
                  insertLineBreakBlock()
                }
                const nextValue = readEditorValue()
                if (nextValue !== value) {
                  onChange(nextValue)
                }
                setIsEmpty(nextValue.length === 0)
                adjustHeight()
              }}
              onPaste={(event) => {
                if (disabled) return
                if (!onAddAttachment || uploading) {
                  event.preventDefault()
                  const text = event.clipboardData?.getData('text/plain') || ''
                  document.execCommand('insertText', false, text)
                  return
                }
                const items = event.clipboardData?.items
                if (!items) return
                const fileItem = Array.from(items).find((item) => item.kind === 'file')
                if (fileItem) {
                  const file = fileItem.getAsFile()
                  if (file) {
                    event.preventDefault()
                    onAddAttachment(file)
                  }
                  return
                }
                const text = event.clipboardData?.getData('text/plain')
                if (text) {
                  event.preventDefault()
                  document.execCommand('insertText', false, text)
                }
              }}
              onKeyDown={(event) => {
                if (isComposingRef.current) return
                if (event.key === 'Enter' && event.shiftKey) {
                  event.preventDefault()
                  insertLineBreakBlock()
                  const nextValue = readEditorValue()
                  if (nextValue !== value) {
                    onChange(nextValue)
                  }
                  setIsEmpty(nextValue.length === 0)
                  adjustHeight()
                  return
                }
                if (event.key === 'Enter') {
                  event.preventDefault()
                  if (isEnabled) onSend()
                }
              }}
            />
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button
              type="button"
              aria-label={t.composer.send}
              disabled={!isEnabled || uploading}
              onClick={() => isEnabled && onSend()}
              className={`p-2 rounded-md transition-colors ${isEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              style={{
                color: isEnabled && !uploading ? '#ffffff' : '#9aa0a6',
                backgroundColor: isEnabled && !uploading ? 'var(--accent)' : 'rgba(127,127,127,0.35)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
