import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createEditor, Editor, Node, Text, Transforms } from 'slate'
import type { BaseRange, Descendant, NodeEntry } from 'slate'
import { Editable, ReactEditor, Slate, withReact } from 'slate-react'

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

type LinkRange = BaseRange & { link?: boolean }

type CustomText = { text: string }
type ParagraphElement = { type: 'paragraph'; children: CustomText[] }

declare module 'slate' {
  interface CustomTypes {
    Element: ParagraphElement
    Text: CustomText
  }
}

const toSlateValue = (text: string): Descendant[] => {
  if (!text) {
    return [{ type: 'paragraph', children: [{ text: '' }] }]
  }
  return text.split('\n').map((line) => ({
    type: 'paragraph',
    children: [{ text: line }],
  }))
}

const toPlainText = (nodes: Descendant[]) => nodes.map((node) => Node.string(node)).join('\n')

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
  const fileRef = useRef<HTMLInputElement | null>(null)
  const editorRef = useRef<HTMLDivElement | null>(null)
  const lastValueRef = useRef(value)
  const maxEditorHeight = 180

  const editor = useMemo(() => withReact(createEditor()), [])
  const [editorValue, setEditorValue] = useState<Descendant[]>(() => toSlateValue(value))

  useEffect(() => {
    if (value === lastValueRef.current) return
    lastValueRef.current = value
    const nextValue = toSlateValue(value)
    setEditorValue(nextValue)
    Editor.withoutNormalizing(editor, () => {
      const start = Editor.start(editor, [])
      const end = Editor.end(editor, [])
      Transforms.delete(editor, { at: { anchor: start, focus: end } })
      Transforms.insertNodes(editor, nextValue)
      const point = value.length === 0 ? Editor.start(editor, []) : Editor.end(editor, [])
      Transforms.select(editor, point)
    })
    setIsEmpty(value.length === 0)
  }, [value, editor])

  const adjustHeight = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    el.style.height = 'auto'
    const next = Math.min(el.scrollHeight, maxEditorHeight)
    el.style.height = `${Math.ceil(next)}px`
  }, [maxEditorHeight])

  useEffect(() => {
    adjustHeight()
  }, [editorValue, adjustHeight])

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
      ReactEditor.focus(editor)
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [disabled, editor])

  const decorate = useCallback((entry: NodeEntry) => {
    const [node, path] = entry
    if (!Text.isText(node)) return []
    const ranges: LinkRange[] = []
    const regex = /https?:\/\/\S{2,}/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(node.text)) !== null) {
      ranges.push({
        anchor: { path, offset: match.index },
        focus: { path, offset: match.index + match[0].length },
        link: true,
      })
    }
    return ranges
  }, [])

  const renderElement = useCallback(({ attributes, children }: { attributes: any; children: any }) => {
    return <div {...attributes}>{children}</div>
  }, [])

  const renderLeaf = useCallback(({ attributes, children, leaf }: { attributes: any; children: any; leaf: any }) => {
    if (leaf.link) {
      return (
        <span {...attributes} className="link">
          {children}
        </span>
      )
    }
    return <span {...attributes}>{children}</span>
  }, [])

  return (
    <div className="px-4 pb-4">
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
            <Slate
              editor={editor}
              initialValue={editorValue}
              onChange={(nextValue) => {
                setEditorValue(nextValue)
                const nextText = toPlainText(nextValue)
                setIsEmpty(nextText.length === 0)
                if (nextText !== lastValueRef.current) {
                  lastValueRef.current = nextText
                  onChange(nextText)
                }
              }}
            >
              <Editable
                ref={editorRef}
                className={`${disabled ? 'cursor-not-allowed' : ''}`}
                readOnly={disabled}
                role="textbox"
                aria-label={placeholder}
                renderElement={renderElement}
                renderLeaf={renderLeaf}
                decorate={decorate}
                spellCheck={false}
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
                onPaste={(event) => {
                  if (disabled) return
                  if (!onAddAttachment || uploading) return
                  const items = event.clipboardData?.items
                  if (!items) return
                  const fileItem = Array.from(items).find((item) => item.kind === 'file')
                  if (fileItem) {
                    const file = fileItem.getAsFile()
                    if (file) {
                      event.preventDefault()
                      onAddAttachment(file)
                    }
                  }
                }}
                onCompositionStart={() => {
                  setIsEmpty(false)
                }}
                onCompositionEnd={() => {
                  const nextText = toPlainText(editor.children)
                  setIsEmpty(nextText.length === 0)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && event.shiftKey) {
                    event.preventDefault()
                    Transforms.insertText(editor, '\n')
                    return
                  }
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    if (isEnabled) onSend()
                  }
                }}
              />
            </Slate>
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
