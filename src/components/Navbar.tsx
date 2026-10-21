import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fonts } from '../lib/theme'

const navLinks = [
  { label: 'Home', id: 'home' },
  { label: 'About', id: 'about' },
  { label: 'Team', id: 'team' },
  { label: 'Fixtures', id: 'fixtures' },
  { label: 'Achievements', id: 'achievements' },
  { label: 'Events', id: 'events' },
  { label: 'Gallery', id: 'gallery' },
  { label: 'Sponsors', id: 'sponsors' },
]

interface NavbarProps {
  onOpenContact?: () => void
}

export default function Navbar({ onOpenContact }: NavbarProps = {}) {
  const { user, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Track window scroll for responsive glassmorphism background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    handleScroll()
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || isOpen
          ? 'bg-[#0c0f24]/90 backdrop-blur-md border-b border-white/10 shadow-lg shadow-black/40 py-3 sm:py-3.5'
          : 'bg-gradient-to-b from-black/70 via-black/25 to-transparent py-4 sm:py-5 md:py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-8 flex items-center justify-between">
        {/* Left Section: Logo & Desktop Navigation */}
        <div className="flex items-center gap-5 md:gap-7 lg:gap-8 xl:gap-10">
          <motion.a
            href="#home"
            aria-label="Ruhuna Hockey home"
            whileHover={{ scale: 1.05, rotate: -2 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7941d] rounded-full"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden shadow-lg shadow-black/40 border-2 border-white/90 bg-white p-0.5 shrink-0 transition-transform duration-300">
              <img
                src="/logo.png"
                alt="Ruhuna Hockey logo"
                className="w-full h-full object-cover rounded-full block"
              />
            </div>
            <span
              className="hidden sm:inline-block font-semibold text-sm sm:text-base tracking-wide text-white group-hover:text-[#f7941d] transition-colors"
              style={{ fontFamily: fonts.heading }}
            >
              Ruhuna <span className="text-[#f7941d]">Hockey</span>
            </span>
          </motion.a>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-3.5 xl:gap-5 2xl:gap-6" aria-label="Main Navigation">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="text-xs xl:text-sm font-medium text-white/80 hover:text-white transition-colors relative py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7941d] rounded group"
                style={{ fontFamily: fonts.body }}
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#f7941d] transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </nav>
        </div>

        {/* Right Section: Auth, Desktop CTA & Mobile Toggle */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Auth Button */}
          {user ? (
            <button
              onClick={() => void signOut()}
              className="text-xs sm:text-sm font-medium text-[#f7941d] hover:text-white border border-[#f7941d]/70 hover:border-[#f7941d] px-3 sm:px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"
              style={{ fontFamily: fonts.body }}
            >
              Log out
            </button>
          ) : (
            <Link
              to="/login"
              className="text-xs sm:text-sm font-medium text-white/80 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-full transition-colors"
              style={{ fontFamily: fonts.body }}
            >
              Login
            </Link>
          )}

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
            className="hidden sm:inline-flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold text-[#1c1f4a] bg-white shadow-md shadow-black/20 hover:shadow-[#f7941d]/30 transition-all duration-200 cursor-pointer"
            style={{ fontFamily: fonts.body }}
          >
            Contact Us
          </motion.a>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isOpen}
            className="lg:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7941d] transition-colors cursor-pointer"
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
            className="lg:hidden overflow-hidden bg-[#0c0f24]/95 backdrop-blur-xl border-t border-white/10"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
              <nav className="flex flex-col gap-1" aria-label="Mobile Navigation">
                {navLinks.map((link, idx) => (
                  <motion.a
                    key={link.id}
                    href={`#${link.id}`}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-4 py-3 rounded-xl text-base font-medium text-white/90 hover:text-white hover:bg-white/10 active:bg-white/15 transition-all"
                    style={{ fontFamily: fonts.body }}
                  >
                    <span>{link.label}</span>
                    <span className="text-white/40 text-xs">→</span>
                  </motion.a>
                ))}
              </nav>

              <div className="pt-3 border-t border-white/10 flex flex-col gap-3">
                <motion.a
                  href="#contact"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  onClick={(e) => {
                    setIsOpen(false)
                    if (onOpenContact) {
                      e.preventDefault()
                      onOpenContact()
                    }
                  }}
                  className="w-full py-3.5 px-4 rounded-xl text-center font-semibold text-sm bg-gradient-to-r from-[#f7941d] to-[#c2670a] text-white shadow-lg shadow-[#f7941d]/20 active:scale-[0.98] transition-transform block"
                  style={{ fontFamily: fonts.body }}
                >
                  Contact Us
                </motion.a>

                {/* Mobile Auth button */}
                {user ? (
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      void signOut()
                    }}
                    className="w-full py-2.5 px-4 rounded-xl text-center font-medium text-sm text-[#f7941d] border border-[#f7941d]/40 hover:bg-[#f7941d]/10 transition-colors"
                    style={{ fontFamily: fonts.body }}
                  >
                    Log out ({user.email})
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full py-2.5 px-4 rounded-xl text-center font-medium text-sm text-white/80 hover:text-white bg-white/5 border border-white/10 transition-colors block"
                    style={{ fontFamily: fonts.body }}
                  >
                    Admin Login
                  </Link>
                )}

                {/* Mobile Social Links */}
                <div className="flex items-center justify-center gap-4 pt-2">
                  <a
                    href="https://web.facebook.com/uorhockey"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="text-white hover:text-[#f7941d] text-xs flex items-center gap-2 py-1.5 px-3.5 rounded-lg bg-white/10 border border-white/20 transition-colors"
                  >
                    Facebook
                  </a>
                  <a
                    href="https://www.instagram.com/ruhuna.hockey/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="text-white hover:text-[#f7941d] text-xs flex items-center gap-2 py-1.5 px-3.5 rounded-lg bg-white/10 border border-white/20 transition-colors"
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
