import { colors } from '../../lib/theme'
export default function EmptyState({ message, loading }: { message: string; loading?: boolean }) {
  return (
    <div style={{ padding: '56px 20px', textAlign: 'center', border: `1px dashed ${colors.glassBorder}`, borderRadius: '20px', color: colors.textSoft, fontSize: '14.5px' }}>
      {loading ? 'Loading…' : message}
    </div>
  )
}
