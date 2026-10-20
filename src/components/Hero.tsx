import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const socials = [
  {
    label: 'Facebook',
    href: 'https://web.facebook.com/uorhockey',
    path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/ruhuna.hockey/',
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z',
  },
]

interface HeroProps {
  onOpenContact?: () => void
}

export default function Hero({ onOpenContact }: HeroProps) {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsVideoModalOpen(false)
    }
    if (isVideoModalOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isVideoModalOpen])

  return (
    <section
      id="home"
      className="relative w-full min-h-[100dvh] flex flex-col justify-between overflow-hidden bg-black"
    >
      {/* Background Video */}
      <video
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        src="/hero.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      {/* Layered responsive overlays for crystal-clear readability on all devices */}
      {/* 1. Mobile full dark vignette / Desktop left-to-right gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c0f24]/85 via-[#0c0f24]/70 to-[#0c0f24]/90 md:bg-gradient-to-r md:from-[#0c0f24]/92 md:via-[#0c0f24]/55 md:to-transparent pointer-events-none" />

      {/* 2. Top-down shadow for navbar contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

      {/* 3. Subtle ambient radial color glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] md:w-[1000px] h-[400px] md:h-[650px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#2f3470]/35 via-transparent to-transparent pointer-events-none" />

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 lg:px-1 pt-2 sm:pt-10 md:pt-12 lg:pt-18 pb-6 sm:pb-8 flex-1 flex flex-col justify-center">
        {/* Ruhuna Badge */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
          className="inline-flex items-center gap-2 sm:gap-2.5 rounded-full py-1.5 px-3 sm:px-4 bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md w-fit max-w-full shadow-lg shadow-black/20"
        >
          <div className="flex items-center shrink-0">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br from-[#f7941d] to-[#c2670a] border-2 border-[#1c1f4a]"
                style={{ marginLeft: i === 0 ? 0 : '-6px' }}
              />
            ))}
          </div>
          <span className="text-xs sm:text-[13px] text-white/80 font-normal truncate">
            Proudly representing <strong className="text-white font-semibold">University of Ruhuna</strong>
          </span>
        </motion.div>

        {/* Hero Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: 'easeOut' }}
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-[4.2rem] font-medium tracking-tight text-white leading-[1.08] mt-4 sm:mt-6 max-w-xl"
        >
          Strike Fast.<br />
          <span className="text-[#f7941d]">Rise</span> Together.
        </motion.h1>

        {/* Hero Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.42, ease: 'easeOut' }}
          className="mt-3 sm:mt-5 text-sm sm:text-base md:text-lg text-white/75 leading-relaxed max-w-md sm:max-w-lg font-normal"
        >
          Ruhuna Hockey brings passion, pace and pride to every match — on the pitch and beyond.
        </motion.p>

        {/* Interactive CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.58, ease: 'easeOut' }}
          className="flex flex-wrap items-center gap-3 sm:gap-4 mt-6 sm:mt-8"
        >
          <motion.a
            href="#contact"
            onClick={(e) => {
              if (onOpenContact) {
                e.preventDefault()
                onOpenContact()
              }
            }}
            whileHover={{ scale: 1.04, borderColor: '#f7941d', boxShadow: '0 0 24px rgba(247,148,29,0.4)' }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center justify-center px-6 sm:px-7 py-3 sm:py-3.5 rounded-full text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-[#1c1f4a] to-[#2f3470] border border-white/20 shadow-lg shadow-black/40 hover:bg-[#2f3470] transition-all cursor-pointer"
          >
            Join the Team
          </motion.a>

          {/* Highlights Trigger */}
          <motion.button
            type="button"
            onClick={() => setIsVideoModalOpen(true)}
            aria-label="Watch match highlights video"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-3 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md text-white transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7941d]"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#f7941d] flex items-center justify-center shadow-md shadow-[#f7941d]/30 group-hover:scale-110 transition-transform">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1c1f4a] translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="text-xs sm:text-sm font-medium pr-1 text-white/90 group-hover:text-white">
              Watch Highlights
            </span>
          </motion.button>
        </motion.div>
      </div>

      {/* Bottom Bar: Social Links & Team Location */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-16 pb-5 sm:pb-7 flex items-center justify-between">
        {/* Social Links */}
        <div className="flex items-center gap-2.5">
          {socials.map((s) => (
            <motion.a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              whileHover={{ scale: 1.12, borderColor: '#f7941d', color: '#f7941d' }}
              whileTap={{ scale: 0.92 }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7941d]"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-white" fill="currentColor" viewBox="0 0 24 24">
                <path d={s.path} />
              </svg>
            </motion.a>
          ))}
        </div>

        {/* Team Sub-Badge / Location */}
        <div className="flex items-center gap-2 text-[11px] sm:text-xs text-white/60">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f7941d] animate-pulse" />
          <span className="hidden xs:inline">University of Ruhuna, Sri Lanka</span>
          <span className="xs:hidden">UOR Hockey</span>
        </div>
      </div>

      {/* Video Highlights Modal */}
      <AnimatePresence>
        {isVideoModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsVideoModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl bg-[#0c0f24] rounded-2xl overflow-hidden border border-white/15 shadow-2xl shadow-black/80"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-[#141838]/80">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#f7941d]" />
                  <h3 className="font-semibold text-sm sm:text-base text-white">
                    Ruhuna Hockey Highlights
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(false)}
                  aria-label="Close highlights modal"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Video Player */}
              <div className="relative aspect-video w-full bg-black">
                <video
                  src="/hero.mp4"
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Modal Footer */}
              <div className="px-4 sm:px-6 py-3 bg-[#141838]/60 flex items-center justify-between text-xs text-white/60">
                <span>Official Match Footage</span>
                <a
                  href="https://www.instagram.com/ruhuna.hockey/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#f7941d] hover:underline"
                >
                  Follow on Instagram →
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

