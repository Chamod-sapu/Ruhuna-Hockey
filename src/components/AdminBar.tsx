import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { colors, fonts } from '../lib/theme'

// Floating pill shown only while an admin is logged in.
export default function AdminBar() {
  const { user, signOut } = useAuth()
  if (!user) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      style={{ position: 'fixed', bottom: '18px', left: '50%', transform: 'translateX(-50%)', zIndex: 60, display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 10px 9px 18px', borderRadius: '999px', background: 'rgba(28,31,74,0.92)', border: `1px solid ${colors.orange}`, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: '0 10px 40px rgba(0,0,0,0.45)', fontFamily: fonts.body, fontSize: '13px', color: '#fff' }}
    >
      <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: colors.orange, boxShadow: `0 0 10px ${colors.orange}` }} />
      <span><strong>Admin mode</strong> · {user.email}</span>
      <button onClick={() => void signOut()} style={{ padding: '7px 16px', borderRadius: '999px', background: '#fff', color: colors.deepNavy, border: 'none', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer' }}>Log out</button>
    </motion.div>
  )
}
