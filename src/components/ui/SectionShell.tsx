import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'
import { colors, fonts } from '../../lib/theme'

interface Props {
  id: string
  eyebrow: string
  title: string
  subtitle?: string
  addLabel?: string          // e.g. "Add match" — the button only shows for logged-in admins
  onAdd?: () => void
  headerExtra?: ReactNode    // filters / tabs placed under the header
  alt?: boolean              // alternate background tone
  children: ReactNode
}

export default function SectionShell({ id, eyebrow, title, subtitle, addLabel, onAdd, headerExtra, alt, children }: Props) {
  const { user } = useAuth()
  return (
    <section id={id} style={{ position: 'relative', padding: '110px clamp(20px, 5vw, 64px)', background: alt ? `linear-gradient(180deg, ${colors.deepNavy} 0%, ${colors.ink} 100%)` : colors.ink, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-120px', right: '-120px', width: '420px', height: '420px', background: 'radial-gradient(circle, rgba(47,52,112,0.35) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', maxWidth: '1240px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px', marginBottom: '38px' }}
        >
          <div style={{ maxWidth: '620px' }}>
            <span style={{ fontFamily: fonts.body, fontSize: '12.5px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: colors.orange }}>{eyebrow}</span>
            <h2 style={{ fontFamily: fonts.heading, fontWeight: 500, fontSize: 'clamp(2rem, 3.6vw, 3rem)', lineHeight: 1.1, letterSpacing: '-0.02em', color: '#fff', marginTop: '10px' }}>{title}</h2>
            {subtitle && <p style={{ fontFamily: fonts.body, fontSize: '15px', lineHeight: 1.6, color: colors.textSoft, marginTop: '12px' }}>{subtitle}</p>}
          </div>
          {user && onAdd && (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={onAdd}
              style={{ padding: '12px 22px', borderRadius: '999px', background: colors.orange, color: colors.deepNavy, border: 'none', fontSize: '14px', fontWeight: 700, fontFamily: fonts.body, cursor: 'pointer', boxShadow: '0 6px 22px rgba(247,148,29,0.3)' }}>
              + {addLabel ?? 'Add'}
            </motion.button>
          )}
        </motion.div>
        {headerExtra && <div style={{ marginBottom: '28px' }}>{headerExtra}</div>}
        {children}
      </div>
    </section>
  )
}
