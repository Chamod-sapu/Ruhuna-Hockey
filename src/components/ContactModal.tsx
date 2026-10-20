import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Player (Tryout)',
    message: '',
  })

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setSubmitted(false)
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => {
      onClose()
      setSubmitted(false)
    }, 2500)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl overflow-y-auto"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-[#0c0f24] rounded-2xl overflow-hidden border border-white/15 shadow-2xl shadow-black/90 my-auto text-white"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-[#141838]/80">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white p-0.5 border border-white/40 overflow-hidden shrink-0">
                  <img src="/logo.png" alt="Ruhuna Hockey" className="w-full h-full object-cover rounded-full" />
                </div>
                <div>
                  <h3 className="font-semibold text-base sm:text-lg text-white leading-tight">
                    Join Ruhuna Hockey
                  </h3>
                  <p className="text-xs text-white/60">University of Ruhuna, Matara</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close contact modal"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6">
              {submitted ? (
                <div className="text-center py-8 flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-[#f7941d]/20 border border-[#f7941d] flex items-center justify-center text-[#f7941d] text-2xl mb-4">
                    ✓
                  </div>
                  <h4 className="text-lg font-semibold text-white">Message Received!</h4>
                  <p className="text-sm text-white/70 mt-1 max-w-xs">
                    Thank you for reaching out. The Ruhuna Hockey team leadership will get in touch with you shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-white/80 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kasun Perera"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-[#f7941d] focus:outline-none focus:ring-1 focus:ring-[#f7941d] text-sm text-white placeholder-white/30 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-white/80 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="kasun@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-[#f7941d] focus:outline-none focus:ring-1 focus:ring-[#f7941d] text-sm text-white placeholder-white/30 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/80 mb-1">
                        Phone / WhatsApp
                      </label>
                      <input
                        type="tel"
                        placeholder="+94 7X XXX XXXX"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-[#f7941d] focus:outline-none focus:ring-1 focus:ring-[#f7941d] text-sm text-white placeholder-white/30 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/80 mb-1">
                      Interest / Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-white/15 focus:border-[#f7941d] focus:outline-none focus:ring-1 focus:ring-[#f7941d] text-sm text-white transition-colors"
                    >
                      <option value="Player (Tryout)">Player (University Student Tryout)</option>
                      <option value="Friendly Match Request">Friendly Match Request</option>
                      <option value="Sponsorship & Partnership">Sponsorship & Partnership</option>
                      <option value="General Inquiry">General Inquiry</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/80 mb-1">
                      Message / Playing Experience
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Tell us about your position, faculty, or any questions..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-[#f7941d] focus:outline-none focus:ring-1 focus:ring-[#f7941d] text-sm text-white placeholder-white/30 transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#f7941d] to-[#c2670a] text-white shadow-lg shadow-[#f7941d]/25 hover:opacity-95 active:scale-[0.98] transition-all mt-1"
                  >
                    Submit Inquiry
                  </button>
                </form>
              )}

              {/* Direct Team Links */}
              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
                <span className="truncate">Wellamadama, Matara, Sri Lanka</span>
                <div className="flex items-center gap-3 shrink-0">
                  <a
                    href="https://web.facebook.com/uorhockey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-[#f7941d] font-medium transition-colors"
                  >
                    Facebook
                  </a>
                  <span>•</span>
                  <a
                    href="https://www.instagram.com/ruhuna.hockey/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-[#f7941d] font-medium transition-colors"
                  >
                    Instagram
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
