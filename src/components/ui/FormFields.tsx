/* eslint-disable react-refresh/only-export-components */
import type { CSSProperties, ReactNode } from 'react'
import { colors, fonts } from '../../lib/theme'

export const inputStyle: CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)',
  border: `1px solid ${colors.glassBorder}`, color: '#fff', fontSize: '14px', fontFamily: fonts.body, outline: 'none',
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: '14px' }}>
      <span style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: colors.grey, marginBottom: '6px', fontFamily: fonts.body }}>{label}</span>
      {children}
      {hint && <span style={{ display: 'block', fontSize: '11.5px', color: colors.textSoft, marginTop: '4px' }}>{hint}</span>}
    </label>
  )
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return <p role="alert" style={{ color: colors.orange, fontSize: '13px', marginBottom: '12px' }}>{message}</p>
}

export function FormActions({ onCancel, saving, submitLabel = 'Save' }: { onCancel: () => void; saving?: boolean; submitLabel?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
      <button type="button" onClick={onCancel} style={{ padding: '11px 20px', borderRadius: '999px', background: 'transparent', border: `1px solid ${colors.glassBorder}`, color: '#fff', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
      <button type="submit" disabled={saving} style={{ padding: '11px 24px', borderRadius: '999px', background: colors.orange, border: 'none', color: colors.deepNavy, fontSize: '14px', fontWeight: 700, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : submitLabel}</button>
    </div>
  )
}
