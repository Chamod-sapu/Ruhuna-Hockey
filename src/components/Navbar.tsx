import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const navLinks = [
  { name: 'Home', href: '#home' },
  { name: 'Team', href: '#team' },
  { name: 'Fixtures', href: '#fixtures' },
  { name: 'Gallery', href: '#gallery' },
  { name: 'Contact', href: '#contact' },
]

interface NavbarProps {
  onOpenContact?: () => void
}

export default function Navbar({ onOpenContact }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Track window scroll for responsive glassmorphism background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || isOpen
        ? 'bg-[#0c0f24]/85 backdrop-blur-md border-b border-white/10 shadow-lg shadow-black/40 py-3 sm:py-4'
        : 'bg-gradient-to-b from-black/60 via-black/20 to-transparent py-4 sm:py-5 md:py-6'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 lg:px-1 flex items-center justify-between">
        {/* Left Section: Logo & Desktop Navigation */}
        <div className="flex items-center gap-6 md:gap-8 lg:gap-11">
          <motion.a
            href="#home"
            aria-label="Ruhuna Hockey home"
            whileHover={{ scale: 1.06, rotate: -2 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7941d] rounded-full"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden shadow-lg shadow-black/40 border-2 border-white/90 bg-white p-0.5 shrink-0 transition-transform duration-300">
              <img
                src="/logo.png"
                alt="Ruhuna Hockey logo"
                className="w-full h-full object-cover rounded-full block"
              />
            </div>
            <span className="hidden sm:inline-block md:hidden lg:inline-block font-semibold text-sm sm:text-base tracking-wide text-white group-hover:text-[#f7941d] transition-colors">
              Ruhuna <span className="text-[#f7941d]">Hockey</span>
            </span>
          </motion.a>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-7" aria-label="Main Navigation">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => {
                  if (link.name === 'Contact' && onOpenContact) {
                    e.preventDefault()
                    onOpenContact()
                  }
                }}
                className="text-sm font-medium text-white/80 hover:text-white transition-colors relative py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7941d] rounded group"
              >
                {link.name}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#f7941d] transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </nav>
        </div>

        {/* Right Section: Desktop CTA & Mobile Toggle */}
        <div className="flex items-center gap-3">
          {/* Desktop Contact CTA Button */}
          <motion.a
            href="#contact"
            onClick={(e) => {
              if (onOpenContact) {
                e.preventDefault()
                onOpenContact()
              }
            }}
            whileHover={{ scale: 1.04, backgroundColor: '#f7941d', color: '#1c1f4a' }}
            whileTap={{ scale: 0.96 }}
            className="hidden md:inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-semibold text-[#1c1f4a] bg-white shadow-md shadow-black/20 hover:shadow-[#f7941d]/30 transition-all duration-200 cursor-pointer"
          >
            Contact Us
          </motion.a>

          {/* Mobile Quick Action (Join) */}
          <button
            type="button"
            onClick={() => {
              if (onOpenContact) onOpenContact()
            }}
            className="md:hidden inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#1c1f4a] bg-white hover:bg-[#f7941d] transition-colors"
          >
            Join
          </button>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isOpen}
            className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7941d] transition-colors"
          >
            <motion.span
              animate={isOpen ? { rotate: 45, y: 7.5 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.25 }}
              className="w-5 h-0.5 bg-white rounded-full block origin-center"
            />
            <motion.span
              animate={isOpen ? { opacity: 0 } : { opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="w-5 h-0.5 bg-white rounded-full block"
            />
            <motion.span
              animate={isOpen ? { rotate: -45, y: -7.5 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.25 }}
              className="w-5 h-0.5 bg-white rounded-full block origin-center"
            />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="md:hidden overflow-hidden bg-[#0c0f24]/95 backdrop-blur-xl border-t border-white/10"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
              <nav className="flex flex-col gap-1" aria-label="Mobile Navigation">
                {navLinks.map((link, idx) => (
                  <motion.a
                    key={link.name}
                    href={link.href}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={(e) => {
                      setIsOpen(false)
                      if (link.name === 'Contact' && onOpenContact) {
                        e.preventDefault()
                        onOpenContact()
                      }
                    }}
                    className="flex items-center justify-between px-4 py-3 rounded-xl text-base font-medium text-white/90 hover:text-white hover:bg-white/10 active:bg-white/15 transition-all"
                  >
                    <span>{link.name}</span>
                    <span className="text-white/40 text-xs">→</span>
                  </motion.a>
                ))}
              </nav>

              <div className="pt-3 border-t border-white/10 flex flex-col gap-3">
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  onClick={() => {
                    setIsOpen(false)
                    if (onOpenContact) onOpenContact()
                  }}
                  className="w-full py-3.5 px-4 rounded-xl text-center font-semibold text-sm bg-gradient-to-r from-[#f7941d] to-[#c2670a] text-white shadow-lg shadow-[#f7941d]/20 active:scale-[0.98] transition-transform"
                >
                  Contact Us
                </motion.button>

                {/* Mobile Social Links */}
                <div className="flex items-center justify-center gap-4 pt-2">
                  <a
                    href="https://web.facebook.com/uorhockey"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="text-white hover:text-[#f7941d] text-xs flex items-center gap-2 py-1 px-3 rounded-lg bg-white/10 border border-white/20 transition-colors"
                  >
                    Facebook
                  </a>
                  <a
                    href="https://www.instagram.com/ruhuna.hockey/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="text-white hover:text-[#f7941d] text-xs flex items-center gap-2 py-1 px-3 rounded-lg bg-white/10 border border-white/20 transition-colors"
                  >
                    Instagram
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
