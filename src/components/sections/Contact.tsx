import { useState, useEffect, useCallback, useMemo, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SectionShell from '../ui/SectionShell'
import Modal from '../ui/Modal'
import { Field, FormError, FormActions, inputStyle } from '../ui/FormFields'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useTable } from '../../hooks/useTable'
import { supabase } from '../../lib/supabase'
import { colors, fonts } from '../../lib/theme'
import { useAuth } from '../../context/AuthContext'
import { fmtDate } from '../../lib/format'
import { LEADERSHIP_ROLES, type Leader, type LeadershipRole, type ContactMessage } from '../../lib/types'

const DEFAULT_ADDRESS = 'University of Ruhuna, Wellamadama, Matara, Sri Lanka'
const COOLDOWN_SECONDS = 30
const MAX_MESSAGE_CHARS = 3000

function getInitials(name: string): string {
  if (!name) return 'RH'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getWhatsAppUrl(phone?: string | null): string | null {
  if (!phone) return null
  let digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('0')) {
    digits = '94' + digits.slice(1)
  } else if (!digits.startsWith('94') && digits.length <= 10) {
    digits = '94' + digits
  }
  return `https://wa.me/${digits}`
}

function formatRelativeTime(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime()
    const diffSec = Math.floor(diffMs / 1000)
    if (diffSec < 60) return 'Just now'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return fmtDate(iso)
  } catch {
    return ''
  }
}

export default function Contact() {
  const { user } = useAuth()

  // 1. Leadership Data (Contact People)
  const { rows: leaders } = useTable<Leader>('leadership', {
    orderBy: 'season_year',
    ascending: false,
  })

  // For each of the leadership roles, find the leader with the highest season_year
  const contactPeople = useMemo(() => {
    return LEADERSHIP_ROLES.map((role: LeadershipRole) => {
      const match = leaders
        .filter((l) => {
          if (l.role === role) return true
          if (role === "Men's Captain" && (l.role === "Men's Team Captain" || l.role === 'Captain')) return true
          if (role === "Women's Captain" && l.role === "Women's Team Captain") return true
          if (role === "Men's Vice Captain" && (l.role === "Vice Men's Team Captain" || l.role === 'Vice Captain')) return true
          if (role === "Women's Vice Captain" && l.role === "Vice Women's Team Captain") return true
          return false
        })
        .sort((a, b) => b.season_year - a.season_year)[0]
      return { role, leader: match ?? null }
    })
  }, [leaders])

  // 2. Site Settings (Club Address, Email, Phone)
  const [contactAddress, setContactAddress] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  const loadSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['contact_address', 'contact_email', 'contact_phone'])

      if (!error && data) {
        const map = Object.fromEntries(
          data.map((r: { key: string; value: string }) => [r.key, r.value])
        )
        if (map.contact_address) setContactAddress(map.contact_address)
        if (map.contact_email) setContactEmail(map.contact_email)
        if (map.contact_phone) setContactPhone(map.contact_phone)
      }
    } catch {
      // Fallback
    }
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  // 3. Admin Club Contact Edit Modal
  const [clubModalOpen, setClubModalOpen] = useState(false)
  const [editAddress, setEditAddress] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  const handleSaveClubSettings = async (e: FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    setSettingsError(null)

    try {
      const now = new Date().toISOString()
      const entries = [
        { key: 'contact_address', value: editAddress.trim(), updated_at: now },
        { key: 'contact_email', value: editEmail.trim(), updated_at: now },
        { key: 'contact_phone', value: editPhone.trim(), updated_at: now },
      ]

      for (const item of entries) {
        const { error } = await supabase.from('site_settings').upsert(item)
        if (error) throw error
      }

      setContactAddress(editAddress.trim())
      setContactEmail(editEmail.trim())
      setContactPhone(editPhone.trim())
      setClubModalOpen(false)
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Failed to update contact settings')
    } finally {
      setSavingSettings(false)
    }
  }

  // 4. Contact Message Form State
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formSubject, setFormSubject] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formSuccess, setFormSuccess] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Client-side cooldown (30s)
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0)

  useEffect(() => {
    const checkCooldown = () => {
      const until = sessionStorage.getItem('contact_cooldown_until')
      if (until) {
        const diff = Math.ceil((parseInt(until, 10) - Date.now()) / 1000)
        setCooldownRemaining(diff > 0 ? diff : 0)
      } else {
        setCooldownRemaining(0)
      }
    }

    checkCooldown()
    const interval = setInterval(checkCooldown, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmitMessage = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)

    // 1. Silent Honeypot rejection
    if (honeypot.trim()) {
      setFormSuccess(true)
      return
    }

    // 2. Cooldown check
    if (cooldownRemaining > 0) {
      setFormError(`Please wait ${cooldownRemaining}s before sending another message.`)
      return
    }

    // 3. Validation
    if (!formName.trim()) {
      setFormError('Please enter your name.')
      return
    }
    if (!formEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail.trim())) {
      setFormError('Please enter a valid email address.')
      return
    }
    if (!formMessage.trim()) {
      setFormError('Please enter a message.')
      return
    }
    if (formMessage.length > MAX_MESSAGE_CHARS) {
      setFormError(`Message exceeds ${MAX_MESSAGE_CHARS} characters limit.`)
      return
    }

    setFormSubmitting(true)
    try {
      const { error } = await supabase.from('contact_messages').insert({
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        subject: formSubject.trim() || null,
        message: formMessage.trim(),
        is_read: false,
      })

      if (error) throw error

      // Set cooldown in sessionStorage
      const cooldownUntil = Date.now() + COOLDOWN_SECONDS * 1000
      sessionStorage.setItem('contact_cooldown_until', cooldownUntil.toString())
      setCooldownRemaining(COOLDOWN_SECONDS)

      setFormSuccess(true)
      setFormName('')
      setFormEmail('')
      setFormSubject('')
      setFormMessage('')
      if (user) void loadMessages()
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to send message. Please try again later.'
      )
    } finally {
      setFormSubmitting(false)
    }
  }

  // 5. Admin Message Inbox State
  const [inboxOpen, setInboxOpen] = useState(false)
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null)
  const [deletingMessage, setDeletingMessage] = useState<ContactMessage | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const loadMessages = useCallback(async () => {
    if (!user) return
    setMessagesLoading(true)
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setMessages(data as ContactMessage[])
      }
    } catch {
      // Ignored
    } finally {
      setMessagesLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      void loadMessages()
    }
  }, [user, loadMessages])

  const unreadCount = useMemo(() => {
    return messages.filter((m) => !m.is_read).length
  }, [messages])

  // Mark message as read / unread
  const toggleMessageRead = async (message: ContactMessage, markRead: boolean) => {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ is_read: markRead })
        .eq('id', message.id)

      if (!error) {
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? { ...m, is_read: markRead } : m))
        )
      }
    } catch {
      // Ignored
    }
  }

  // Expand message and mark as read automatically
  const handleToggleExpand = (message: ContactMessage) => {
    if (expandedMessageId === message.id) {
      setExpandedMessageId(null)
    } else {
      setExpandedMessageId(message.id)
      if (!message.is_read) {
        void toggleMessageRead(message, true)
      }
    }
  }

  // Delete message
  const handleConfirmDeleteMessage = async () => {
    if (!deletingMessage) return
    setDeleteBusy(true)
    try {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', deletingMessage.id)

      if (!error) {
        setMessages((prev) => prev.filter((m) => m.id !== deletingMessage.id))
        if (expandedMessageId === deletingMessage.id) {
          setExpandedMessageId(null)
        }
      }
    } catch {
      // Ignored
    } finally {
      setDeleteBusy(false)
      setDeletingMessage(null)
    }
  }

  return (
    <SectionShell
      id="contact"
      alt
      eyebrow="Get in Touch"
      title="Contact Us"
      subtitle="Have questions, partnership inquiries, or want to join the Ruhuna Hockey family? Reach out to our leadership team or send us a direct message."
      headerExtra={
        user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                void loadMessages()
                setInboxOpen(true)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '999px',
                background: unreadCount > 0 ? colors.orange : 'rgba(255,255,255,0.08)',
                color: unreadCount > 0 ? colors.deepNavy : '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                fontFamily: fonts.body,
                border: unreadCount > 0 ? 'none' : `1px solid ${colors.glassBorder}`,
                cursor: 'pointer',
                boxShadow: unreadCount > 0 ? '0 4px 14px rgba(247,148,29,0.35)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <span>📬 Inbox</span>
              {unreadCount > 0 ? (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: colors.deepNavy,
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                  }}
                >
                  {unreadCount} unread
                </span>
              ) : (
                <span style={{ opacity: 0.65, fontSize: '12px' }}>({messages.length})</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setEditAddress(contactAddress)
                setEditEmail(contactEmail)
                setEditPhone(contactPhone)
                setClubModalOpen(true)
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.08)',
                border: `1px solid ${colors.glassBorder}`,
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: fonts.body,
                cursor: 'pointer',
              }}
            >
              ⚙️ Edit club contact
            </button>
          </div>
        ) : undefined
      }
    >
      {/* TWO-COLUMN PUBLIC LAYOUT (STACKED ON MOBILE) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
          gap: '36px',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: REACH THE TEAM */}
        <div>
          <div style={{ marginBottom: '18px' }}>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: colors.orange,
                fontFamily: fonts.body,
              }}
            >
              Leadership
            </span>
            <h3
              style={{
                fontFamily: fonts.heading,
                fontSize: '24px',
                fontWeight: 600,
                color: '#ffffff',
                margin: '4px 0 0',
              }}
            >
              Reach the Team
            </h3>
          </div>

          {/* Four Contact Cards: Captain, Vice Captain, Team Manager, Coach */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {contactPeople.map(({ role, leader }) => {
              const whatsAppUrl = getWhatsAppUrl(leader?.phone)

              return (
                <div
                  key={role}
                  style={{
                    borderRadius: '18px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${colors.glassBorder}`,
                    padding: '16px 20px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* Circular Photo / Initials Fallback */}
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '999px',
                        overflow: 'hidden',
                        background: colors.navy,
                        border: `1.5px solid ${colors.glassBorder}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {leader?.photo_url ? (
                        <img
                          src={leader.photo_url}
                          alt={leader.full_name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span
                          style={{
                            fontFamily: fonts.heading,
                            fontWeight: 700,
                            fontSize: '17px',
                            color: colors.orange,
                          }}
                        >
                          {leader ? getInitials(leader.full_name) : 'RH'}
                        </span>
                      )}
                    </div>

                    {/* Name, Role Badge & Season */}
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '3px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background:
                              role.includes('Captain') && !role.includes('Vice')
                                ? colors.orange
                                : role.includes('Vice')
                                ? 'rgba(247, 148, 29, 0.18)'
                                : 'rgba(255, 255, 255, 0.08)',
                            color:
                              role.includes('Captain') && !role.includes('Vice')
                                ? colors.deepNavy
                                : role.includes('Vice')
                                ? colors.orange
                                : '#ffffff',
                            border:
                              role.includes('Captain') && !role.includes('Vice')
                                ? 'none'
                                : role.includes('Vice')
                                ? '1px solid rgba(247, 148, 29, 0.4)'
                                : '1px solid rgba(255, 255, 255, 0.15)',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            fontFamily: fonts.body,
                          }}
                        >
                          {role}
                        </span>

                        {leader?.season_year && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: colors.grey,
                              fontFamily: fonts.body,
                            }}
                          >
                            Season {leader.season_year}
                          </span>
                        )}
                      </div>

                      <h4
                        style={{
                          fontFamily: fonts.heading,
                          fontWeight: 600,
                          fontSize: '16px',
                          color: '#ffffff',
                          margin: 0,
                          lineHeight: 1.3,
                        }}
                      >
                        {leader ? leader.full_name : 'To be announced'}
                      </h4>
                    </div>
                  </div>

                  {/* Action Buttons: Call, Email, WhatsApp */}
                  {leader && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {leader.phone && (
                        <a
                          href={`tel:${leader.phone}`}
                          title={`Call ${leader.full_name}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 14px',
                            borderRadius: '999px',
                            background: 'rgba(255,255,255,0.08)',
                            border: `1px solid ${colors.glassBorder}`,
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: 600,
                            fontFamily: fonts.body,
                            textDecoration: 'none',
                            transition: 'background 0.2s',
                          }}
                        >
                          <span>📞</span>
                          <span>Call</span>
                        </a>
                      )}

                      {leader.email && (
                        <a
                          href={`mailto:${leader.email}`}
                          title={`Email ${leader.full_name}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 14px',
                            borderRadius: '999px',
                            background: 'rgba(255,255,255,0.08)',
                            border: `1px solid ${colors.glassBorder}`,
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: 600,
                            fontFamily: fonts.body,
                            textDecoration: 'none',
                            transition: 'background 0.2s',
                          }}
                        >
                          <span>✉️</span>
                          <span>Email</span>
                        </a>
                      )}

                      {whatsAppUrl && (
                        <a
                          href={whatsAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Chat on WhatsApp"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 14px',
                            borderRadius: '999px',
                            background: 'rgba(34, 197, 94, 0.18)',
                            border: '1px solid rgba(34, 197, 94, 0.4)',
                            color: '#4ade80',
                            fontSize: '12px',
                            fontWeight: 700,
                            fontFamily: fonts.body,
                            textDecoration: 'none',
                            transition: 'background 0.2s',
                          }}
                        >
                          <span>💬</span>
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Admin Note regarding Leadership Sync */}
          {user && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px 18px',
                borderRadius: '12px',
                background: 'rgba(247, 148, 29, 0.08)',
                border: '1px solid rgba(247, 148, 29, 0.25)',
                fontSize: '12.5px',
                color: colors.grey,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>ℹ️</span>
              <span>
                Contact people are managed in{' '}
                <a
                  href="#about"
                  style={{
                    color: colors.orange,
                    fontWeight: 700,
                    textDecoration: 'underline',
                  }}
                >
                  About Us → Leadership
                </a>
              </span>
            </div>
          )}

          {/* General Club Address & Social Block */}
          <div
            style={{
              marginTop: '24px',
              borderRadius: '20px',
              background: `linear-gradient(135deg, ${colors.deepNavy}, ${colors.ink})`,
              border: `1px solid ${colors.glassBorder}`,
              padding: '24px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            }}
          >
            <h4
              style={{
                fontFamily: fonts.heading,
                fontSize: '16px',
                fontWeight: 600,
                color: '#ffffff',
                margin: '0 0 14px',
              }}
            >
              Club Headquarters
            </h4>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '13.5px',
                color: colors.textSoft,
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: colors.orange }}>📍</span>
                <span>{contactAddress || DEFAULT_ADDRESS}</span>
              </div>

              {contactEmail && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: colors.orange }}>✉️</span>
                  <a
                    href={`mailto:${contactEmail}`}
                    style={{ color: '#fff', textDecoration: 'none' }}
                  >
                    {contactEmail}
                  </a>
                </div>
              )}

              {contactPhone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: colors.orange }}>📞</span>
                  <a
                    href={`tel:${contactPhone}`}
                    style={{ color: '#fff', textDecoration: 'none' }}
                  >
                    {contactPhone}
                  </a>
                </div>
              )}
            </div>

            {/* Social Media Links */}
            <div
              style={{
                paddingTop: '16px',
                borderTop: `1px solid ${colors.glassBorder}`,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '12px', color: colors.grey, fontWeight: 600 }}>
                Follow us:
              </span>

              <a
                href="https://web.facebook.com/uorhockey"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${colors.glassBorder}`,
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'background 0.2s',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
                <span>Facebook</span>
              </a>

              <a
                href="https://www.instagram.com/ruhuna.hockey/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${colors.glassBorder}`,
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'background 0.2s',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
                <span>Instagram</span>
              </a>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MESSAGE FORM */}
        <div
          style={{
            borderRadius: '24px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${colors.glassBorder}`,
            padding: 'clamp(24px, 4vw, 38px)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ marginBottom: '22px' }}>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: colors.orange,
                fontFamily: fonts.body,
              }}
            >
              Direct Message
            </span>
            <h3
              style={{
                fontFamily: fonts.heading,
                fontSize: '24px',
                fontWeight: 600,
                color: '#ffffff',
                margin: '4px 0 0',
              }}
            >
              Send Us a Message
            </h3>
            <p style={{ fontFamily: fonts.body, fontSize: '13.5px', color: colors.textSoft, marginTop: '6px', lineHeight: 1.5 }}>
              Whether you're inquiring about practices, fixtures, tournaments, or sponsorships, our team will reply promptly.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {formSuccess ? (
              <motion.div
                key="form-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: 'rgba(34, 197, 94, 0.08)',
                  borderRadius: '18px',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '999px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#4ade80',
                    fontSize: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  ✓
                </div>
                <h4
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#ffffff',
                    margin: '0 0 8px',
                  }}
                >
                  Message Sent
                </h4>
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: '14px',
                    color: colors.grey,
                    margin: '0 auto 24px',
                    maxWidth: '380px',
                    lineHeight: 1.6,
                  }}
                >
                  Thank you for reaching out! We have received your message and will get back to you soon.
                </p>
                <button
                  type="button"
                  onClick={() => setFormSuccess(false)}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '999px',
                    background: colors.orange,
                    color: colors.deepNavy,
                    fontWeight: 700,
                    fontSize: '13.5px',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: fonts.body,
                  }}
                >
                  Send Another Message
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="contact-form"
                onSubmit={handleSubmitMessage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Hidden Honeypot Input for anti-spam */}
                <input
                  type="text"
                  name="b_website_url_check"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  style={{ display: 'none', position: 'absolute', left: '-9999px' }}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                />

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '14px',
                  }}
                >
                  <Field label="Your Name *">
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      style={inputStyle}
                      placeholder="e.g. Kasun Perera"
                    />
                  </Field>

                  <Field label="Your Email *">
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      style={inputStyle}
                      placeholder="e.g. kasun@example.com"
                    />
                  </Field>
                </div>

                <Field label="Subject (Optional)">
                  <input
                    type="text"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. Tournament Invitation / Team Inquiry"
                  />
                </Field>

                <div style={{ position: 'relative' }}>
                  <Field label="Message *">
                    <textarea
                      required
                      rows={5}
                      maxLength={MAX_MESSAGE_CHARS}
                      value={formMessage}
                      onChange={(e) => setFormMessage(e.target.value)}
                      style={{ ...inputStyle, resize: 'vertical' }}
                      placeholder="Write your message here..."
                    />
                  </Field>

                  {/* Live Character Counter */}
                  <div
                    style={{
                      textAlign: 'right',
                      marginTop: '-10px',
                      marginBottom: '14px',
                      fontSize: '11px',
                      color:
                        formMessage.length > MAX_MESSAGE_CHARS - 100
                          ? colors.orange
                          : colors.textSoft,
                      fontFamily: fonts.body,
                    }}
                  >
                    {formMessage.length} / {MAX_MESSAGE_CHARS}
                  </div>
                </div>

                <FormError message={formError} />

                <div style={{ marginTop: '8px' }}>
                  <button
                    type="submit"
                    disabled={formSubmitting || cooldownRemaining > 0}
                    style={{
                      width: '100%',
                      padding: '13px 24px',
                      borderRadius: '999px',
                      background: colors.orange,
                      border: 'none',
                      color: colors.deepNavy,
                      fontSize: '14.5px',
                      fontWeight: 700,
                      fontFamily: fonts.body,
                      cursor:
                        formSubmitting || cooldownRemaining > 0 ? 'not-allowed' : 'pointer',
                      opacity: formSubmitting || cooldownRemaining > 0 ? 0.65 : 1,
                      boxShadow: '0 4px 18px rgba(247,148,29,0.3)',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {formSubmitting
                      ? 'Sending Message…'
                      : cooldownRemaining > 0
                        ? `Wait ${cooldownRemaining}s before resending`
                        : 'Send Message →'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 6. ADMIN INBOX MODAL */}
      <Modal
        open={inboxOpen}
        title={`Message Inbox (${messages.length})`}
        onClose={() => setInboxOpen(false)}
        width={760}
      >
        <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
          {messagesLoading ? (
            <p style={{ color: colors.textSoft, textAlign: 'center', padding: '24px' }}>
              Loading messages…
            </p>
          ) : messages.length === 0 ? (
            <div style={{ padding: '36px 0', textAlign: 'center', color: colors.textSoft }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📭</span>
              <p style={{ margin: 0, fontSize: '14.5px' }}>No messages received yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.map((msg) => {
                const isExpanded = expandedMessageId === msg.id

                return (
                  <div
                    key={msg.id}
                    onClick={() => handleToggleExpand(msg)}
                    style={{
                      borderRadius: '14px',
                      background: msg.is_read
                        ? 'rgba(255,255,255,0.03)'
                        : 'rgba(247, 148, 29, 0.08)',
                      border: `1px solid ${
                        msg.is_read ? colors.glassBorder : 'rgba(247, 148, 29, 0.4)'
                      }`,
                      padding: '14px 18px',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    {/* Message Header Strip */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Orange Unread Dot */}
                        {!msg.is_read && (
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '999px',
                              background: colors.orange,
                              boxShadow: '0 0 8px rgba(247,148,29,0.8)',
                              flexShrink: 0,
                            }}
                          />
                        )}

                        <div>
                          <span
                            style={{
                              fontFamily: fonts.heading,
                              fontWeight: msg.is_read ? 600 : 700,
                              fontSize: '15px',
                              color: '#ffffff',
                            }}
                          >
                            {msg.name}
                          </span>
                          <span
                            style={{
                              fontSize: '12.5px',
                              color: colors.textSoft,
                              marginLeft: '8px',
                              fontFamily: fonts.body,
                            }}
                          >
                            &lt;{msg.email}&gt;
                          </span>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '11.5px',
                          color: colors.grey,
                          fontFamily: fonts.body,
                        }}
                      >
                        {formatRelativeTime(msg.created_at)}
                      </span>
                    </div>

                    {/* Subject Line */}
                    <div
                      style={{
                        fontSize: '13.5px',
                        fontWeight: msg.is_read ? 500 : 600,
                        color: msg.is_read ? colors.grey : '#ffffff',
                        marginTop: '6px',
                        fontFamily: fonts.body,
                      }}
                    >
                      {msg.subject ? msg.subject : '(No Subject)'}
                    </div>

                    {/* Expanded Body & Actions */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            marginTop: '14px',
                            paddingTop: '14px',
                            borderTop: `1px solid ${colors.glassBorder}`,
                          }}
                        >
                          <div
                            style={{
                              fontFamily: fonts.body,
                              fontSize: '13.5px',
                              lineHeight: 1.65,
                              color: 'rgba(255,255,255,0.9)',
                              whiteSpace: 'pre-wrap',
                              marginBottom: '16px',
                            }}
                          >
                            {msg.message}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '10px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <a
                                href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(
                                  msg.subject || 'Ruhuna Hockey Contact'
                                )}`}
                                style={{
                                  padding: '6px 16px',
                                  borderRadius: '999px',
                                  background: colors.orange,
                                  color: colors.deepNavy,
                                  fontWeight: 700,
                                  fontSize: '12.5px',
                                  textDecoration: 'none',
                                  fontFamily: fonts.body,
                                }}
                              >
                                Reply by Email ↗
                              </a>

                              <button
                                type="button"
                                onClick={() => void toggleMessageRead(msg, !msg.is_read)}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '999px',
                                  background: 'rgba(255,255,255,0.08)',
                                  border: `1px solid ${colors.glassBorder}`,
                                  color: '#fff',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                }}
                              >
                                {msg.is_read ? 'Mark Unread' : 'Mark Read'}
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => setDeletingMessage(msg)}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '999px',
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#f87171',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* 7. ADMIN EDIT CLUB CONTACT MODAL */}
      <Modal
        open={clubModalOpen}
        title="Edit Club Headquarters & Contacts"
        onClose={() => setClubModalOpen(false)}
        width={540}
      >
        <form onSubmit={handleSaveClubSettings}>
          <Field label="Club Address">
            <textarea
              rows={2}
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder={DEFAULT_ADDRESS}
            />
          </Field>

          <Field label="General Email">
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              style={inputStyle}
              placeholder="e.g. hockey@ruh.ac.lk"
            />
          </Field>

          <Field label="General Phone">
            <input
              type="text"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              style={inputStyle}
              placeholder="e.g. +94 41 222 2681"
            />
          </Field>

          <FormError message={settingsError} />

          <FormActions
            onCancel={() => setClubModalOpen(false)}
            saving={savingSettings}
            submitLabel="Save Changes"
          />
        </form>
      </Modal>

      {/* 8. ADMIN DELETE MESSAGE CONFIRM DIALOG */}
      <ConfirmDialog
        open={!!deletingMessage}
        message={`Are you sure you want to delete the message from "${deletingMessage?.name}"?`}
        busy={deleteBusy}
        onConfirm={() => void handleConfirmDeleteMessage()}
        onCancel={() => setDeletingMessage(null)}
      />
    </SectionShell>
  )
}
