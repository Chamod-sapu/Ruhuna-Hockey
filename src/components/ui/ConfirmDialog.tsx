import Modal from './Modal'
import { colors } from '../../lib/theme'

interface Props { open: boolean; message: string; busy?: boolean; onConfirm: () => void; onCancel: () => void }

export default function ConfirmDialog({ open, message, busy, onConfirm, onCancel }: Props) {
  return (
    <Modal open={open} title="Are you sure?" onClose={onCancel} width={420}>
      <p style={{ color: colors.textSoft, fontSize: '14.5px', lineHeight: 1.6, marginBottom: '20px' }}>{message}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button onClick={onCancel} style={{ padding: '11px 20px', borderRadius: '999px', background: 'transparent', border: `1px solid ${colors.glassBorder}`, color: '#fff', cursor: 'pointer' }}>Cancel</button>
        <button onClick={onConfirm} disabled={busy} style={{ padding: '11px 22px', borderRadius: '999px', background: colors.orange, border: 'none', color: colors.deepNavy, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Deleting…' : 'Delete'}</button>
      </div>
    </Modal>
  )
}
