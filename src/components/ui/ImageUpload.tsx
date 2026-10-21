import { useRef, useState } from 'react'
import { colors } from '../../lib/theme'
import { uploadImage } from '../../lib/storage'
import { FormError } from './FormFields'

interface Props {
  label?: string
  value: string | null
  onChange: (url: string | null) => void
  folder: string
  shape?: 'square' | 'circle' | 'wide'
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10 MB

export default function ImageUpload({
  label = 'Image',
  value,
  onChange,
  folder,
  shape = 'square',
}: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const dims =
    shape === 'wide'
      ? { width: '160px', height: '90px' }
      : { width: '96px', height: '96px' }
  const radius = shape === 'circle' ? '999px' : '14px'

  const pick = async (file?: File) => {
    if (!file) return

    // Type validation
    if (!file.type.startsWith('image/')) {
      setErr('Only image files (JPG, PNG, WebP) are allowed.')
      return
    }

    // Size validation (<= 10MB)
    if (file.size > MAX_IMAGE_BYTES) {
      setErr('File size must be 10 MB or less.')
      return
    }

    setBusy(true)
    setErr(null)
    try {
      onChange(await uploadImage(file, folder))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed')
    }
    setBusy(false)
  }

  return (
    <div style={{ marginBottom: '14px' }}>
      <span
        style={{
          display: 'block',
          fontSize: '12.5px',
          fontWeight: 600,
          color: colors.grey,
          marginBottom: '6px',
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            ...dims,
            borderRadius: radius,
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.06)',
            border: `1px dashed ${colors.glassBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textSoft,
            fontSize: '11px',
          }}
        >
          {value ? (
            <img src={value} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            'No image'
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            ref={ref}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => void pick(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => ref.current?.click()}
            disabled={busy}
            style={{
              padding: '9px 18px',
              minHeight: '40px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.1)',
              border: `1px solid ${colors.glassBorder}`,
              color: '#fff',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              style={{
                padding: '6px 16px',
                borderRadius: '999px',
                background: 'transparent',
                border: 'none',
                color: colors.orange,
                fontSize: '12.5px',
                cursor: 'pointer',
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <FormError message={err} />
    </div>
  )
}
