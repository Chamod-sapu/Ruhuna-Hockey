import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
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
  const location = useLocation()
  const navigate = useNavigate()
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

  // Smooth scroll helper for both desktop and mobile
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    setIsOpen(false)
    document.body.style.overflow = ''

    const scrollToSection = () => {
      const el = document.getElementById(id)
      if (el) {
        const navHeight = 76
        const elementPosition = el.getBoundingClientRect().top + window.scrollY
        const offsetPosition = Math.max(0, elementPosition - navHeight)

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        })
        window.history.pushState(null, '', `#${id}`)
      } else {
        // Fallback for lazy loaded sections
        setTimeout(() => {
          const retryEl = document.getElementById(id)
          if (retryEl) {
            const navHeight = 76
            const elementPosition = retryEl.getBoundingClientRect().top + window.scrollY
            const offsetPosition = Math.max(0, elementPosition - navHeight)
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth',
            })
            window.history.pushState(null, '', `#${id}`)
          }
        }, 150)
      }
    }

    if (location.pathname !== '/') {
      navigate(`/#${id}`)
      setTimeout(scrollToSection, 150)
    } else {
      setTimeout(scrollToSection, 40)
    }
  }

  // Handle direct links or initial mount with #hash
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '')
      const timer = setTimeout(() => {
        const el = document.getElementById(id)
        if (el) {
          const navHeight = 76
          const elementPosition = el.getBoundingClientRect().top + window.scrollY
          const offsetPosition = Math.max(0, elementPosition - navHeight)
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth',
          })
        }
      }, 350)
      return () => clearTimeout(timer)
    }
  }, [location.pathname, location.hash])

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || isOpen
          ? 'bg-[#0c0f24]/75 backdrop-blur-xl border-b border-white/15 shadow-xl shadow-black/50 py-3 sm:py-3.5'
          : 'bg-gradient-to-b from-black/70 via-black/25 to-transparent py-4 sm:py-5 md:py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-8 flex items-center justify-between">
        {/* Left Section: Logo & Desktop Navigation */}
        <div className="flex items-center gap-5 md:gap-7 lg:gap-8 xl:gap-10">
          <motion.a
            href="#home"
            onClick={(e) => handleNavClick(e, 'home')}
            aria-label="Ruhuna Hockey home"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-2.5 sm:gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7941d] rounded-full cursor-pointer"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden shadow-[0_0_14px_rgba(247,148,29,0.4)] group-hover:shadow-[0_0_22px_rgba(247,148,29,0.7)] bg-white p-1 shrink-0 transition-all duration-300">
              <img
                src="/logo.png"
                alt="Ruhuna Hockey logo"
                className="w-full h-full object-contain rounded-full block"
              />
            </div>
            <span
              className="flex items-center gap-1 font-bold text-sm sm:text-base tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-colors"
              style={{ fontFamily: fonts.heading }}
            >
              <span>Ruhuna</span>
              <span className="text-[#f7941d] group-hover:brightness-125 transition-all">Hockey</span>
            </span>
          </motion.a>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-3.5 xl:gap-5 2xl:gap-6" aria-label="Main Navigation">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(e) => handleNavClick(e, link.id)}
                className="text-xs xl:text-sm font-medium text-white/80 hover:text-white transition-colors relative py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7941d] rounded group cursor-pointer"
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
          {/* Auth Button (only visible when logged in) */}
          {user && (
            <button
              onClick={() => void signOut()}
              className="text-xs sm:text-sm font-medium text-[#f7941d] hover:text-white border border-[#f7941d]/70 hover:border-[#f7941d] px-3 sm:px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"
              style={{ fontFamily: fonts.body }}
            >
              Log out
            </button>
          )}

          {/* Desktop Contact CTA Button */}
          <motion.a
            href="#contact"
            onClick={(e) => {
              if (onOpenContact) {
                e.preventDefault()
                onOpenContact()
              } else {
                handleNavClick(e, 'contact')
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
            className={`lg:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
              isOpen
                ? 'bg-[#f7941d]/20 border border-[#f7941d]/60 text-[#f7941d] shadow-[0_0_14px_rgba(247,148,29,0.35)]'
                : 'bg-white/10 hover:bg-white/15 border border-white/15 text-white'
            }`}
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

      {/* Mobile Drawer Menu — Glassmorphism Design */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="lg:hidden relative overflow-hidden bg-gradient-to-b from-[#1c1f4a]/85 via-[#0c0f24]/80 to-[#0c0f24]/90 backdrop-blur-2xl border-t border-b border-white/15 shadow-[0_24px_50px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.15)] max-h-[calc(100dvh-75px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {/* Ambient Radial Glass Highlights */}
            <div className="absolute top-0 left-1/4 -translate-x-1/2 w-64 h-32 bg-[#f7941d]/15 blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 right-0 w-64 h-48 bg-[#2f3470]/30 blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col gap-4">
              <nav className="flex flex-col gap-1.5" aria-label="Mobile Navigation">
                {navLinks.map((link, idx) => (
                  <motion.a
                    key={link.id}
                    href={`#${link.id}`}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={(e) => handleNavClick(e, link.id)}
                    className="flex items-center justify-between px-4 py-3 rounded-xl text-base font-medium text-white/95 bg-white/[0.04] hover:bg-white/[0.10] active:bg-white/[0.14] border border-white/[0.08] hover:border-[#f7941d]/40 shadow-sm backdrop-blur-md transition-all duration-200 cursor-pointer group"
                    style={{ fontFamily: fonts.body }}
                  >
                    <span className="group-hover:text-white transition-colors">{link.label}</span>
                    <span className="text-[#f7941d] text-sm font-semibold group-hover:translate-x-1 transition-transform">→</span>
                  </motion.a>
                ))}
              </nav>

              <div className="pt-3 border-t border-white/10 flex flex-col gap-3">
                <motion.a
                  href="#contact"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  onClick={(e) => {
                    if (onOpenContact) {
                      e.preventDefault()
                      setIsOpen(false)
                      document.body.style.overflow = ''
                      onOpenContact()
                    } else {
                      handleNavClick(e, 'contact')
                    }
                  }}
                  className="w-full py-3.5 px-4 rounded-xl text-center font-semibold text-sm bg-gradient-to-r from-[#f7941d] to-[#c2670a] text-white shadow-lg shadow-[#f7941d]/30 border border-white/20 active:scale-[0.98] transition-all block cursor-pointer"
                  style={{ fontFamily: fonts.body }}
                >
                  Contact Us
                </motion.a>

                {/* Mobile Auth button (only visible when logged in) */}
                {user && (
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      void signOut()
                    }}
                    className="w-full py-2.5 px-4 rounded-xl text-center font-medium text-sm text-[#f7941d] bg-white/[0.05] hover:bg-white/[0.10] border border-[#f7941d]/40 backdrop-blur-md shadow-sm transition-colors cursor-pointer"
                    style={{ fontFamily: fonts.body }}
                  >
                    Log out ({user.email})
                  </button>
                )}

                {/* Mobile Social Links */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <a
                    href="https://web.facebook.com/uorhockey"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="text-white hover:text-[#f7941d] text-xs flex items-center gap-2 py-2 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 backdrop-blur-md shadow-sm transition-all"
                  >
                    Facebook
                  </a>
                  <a
                    href="https://www.instagram.com/ruhuna.hockey/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="text-white hover:text-[#f7941d] text-xs flex items-center gap-2 py-2 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 backdrop-blur-md shadow-sm transition-all"
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
