import { useAuth } from '../../context/AuthContext'
import { colors } from '../../lib/theme'

const btn = { width: '30px', height: '30px', borderRadius: '999px', border: `1px solid ${colors.glassBorder}`, background: 'rgba(11,13,38,0.75)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(6px)' } as const

// Small edit / delete icons — render nothing unless an admin is logged in.
export default function RowActions({ onEdit, onDelete }: { onEdit?: () => void; onDelete?: () => void }) {
  const { user } = useAuth()
  if (!user) return null
  return (
    <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
      {onEdit && (
        <button aria-label="Edit" title="Edit" onClick={onEdit} style={btn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
        </button>
      )}
      {onDelete && (
        <button aria-label="Delete" title="Delete" onClick={onDelete} style={{ ...btn, color: colors.orange }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></svg>
        </button>
      )}
    </div>
  )
}
