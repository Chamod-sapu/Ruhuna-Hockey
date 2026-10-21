import { useState, useEffect } from 'react'
import { colors, fonts } from '../lib/theme'

export default function DevEnvBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Dev only check
    if (!import.meta.env.DEV) return

    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

    const isMissing =
      !url ||
      !key ||
      url.includes('YOUR-PROJECT-REF') ||
      key.includes('YOUR-ANON-PUBLIC-KEY')

    const dismissed = sessionStorage.getItem('dismissed_dev_env_banner') === 'true'

    if (isMissing && !dismissed) {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  const handleDismiss = () => {
    sessionStorage.setItem('dismissed_dev_env_banner', 'true')
    setVisible(false)
  }

  return (
    <div
      role="alert"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        background: '#78350f',
        borderBottom: `1px solid ${colors.orange}`,
        padding: '10px 16px',
        color: '#fef3c7',
        fontFamily: fonts.body,
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
        <span style={{ fontSize: '16px' }}>⚠️</span>
        <span>
          <strong>Development Notice:</strong> Supabase environment variables are missing or using
          placeholders. Copy <code>.env.example</code> to <code>.env</code> with your project URL and
          public anon key to enable live backend synchronization.
        </span>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        style={{
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          color: '#ffffff',
          borderRadius: '999px',
          width: '28px',
          height: '28px',
          minWidth: '28px',
          minHeight: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '14px',
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  )
}
