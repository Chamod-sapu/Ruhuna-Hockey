import { motion } from 'framer-motion'

const navLinks = ["Home", "Team", "Fixtures", "Gallery", "Contact"]

export default function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 44px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '44px' }}>
        <motion.a
          href="#home"
          aria-label="Ruhuna Hockey home"
          whileHover={{ scale: 1.06, rotate: -3 }}
          whileTap={{ scale: 0.96 }}
          style={{ display: 'block', width: '54px', height: '54px', borderRadius: '999px', overflow: 'hidden', boxShadow: '0 4px 18px rgba(0,0,0,0.35)', border: '2px solid rgba(255,255,255,0.9)', background: '#fff' }}
        >
          <img src="/logo.png" alt="Ruhuna Hockey logo" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </motion.a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          {navLinks.map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              style={{ fontSize: '14px', fontWeight: 500, fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.82)', textDecoration: 'none' }}
            >
              {link}
            </a>
          ))}
        </div>
      </div>
      <motion.a
        href="#contact"
        whileHover={{ scale: 1.04, backgroundColor: '#f7941d', color: '#1c1f4a' }}
        whileTap={{ scale: 0.97 }}
        style={{
          padding: '11px 24px',
          borderRadius: '999px',
          fontSize: '14px',
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
          color: '#1c1f4a',
          textDecoration: 'none',
          background: '#fff',
          boxShadow: '0 4px 18px rgba(0,0,0,0.25)',
        }}
      >
        Contact Us
      </motion.a>
    </motion.nav>
  )
}
