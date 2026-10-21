import { useState, useMemo, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import SectionShell from '../ui/SectionShell'
import Modal from '../ui/Modal'
import { Field, FormError, FormActions, inputStyle } from '../ui/FormFields'
import ImageUpload from '../ui/ImageUpload'
import ConfirmDialog from '../ui/ConfirmDialog'
import RowActions from '../ui/RowActions'
import EmptyState from '../ui/EmptyState'
import { useTable } from '../../hooks/useTable'
import { deleteImageByUrl } from '../../lib/storage'
import { colors, fonts } from '../../lib/theme'
import { useAuth } from '../../context/AuthContext'
import { fmtDate, fmtTime, fmtDay, fmtMonth, toLocalInput, fromLocalInput } from '../../lib/format'
import { type EventItem } from '../../lib/types'

function formatUtcForIcs(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function downloadEventIcs(event: EventItem) {
  const startDate = new Date(event.start_at)
  const endDate = event.end_at ? new Date(event.end_at) : new Date(startDate.getTime() + 2 * 3600 * 1000)
  const startStr = formatUtcForIcs(startDate)
  const endStr = formatUtcForIcs(endDate)
  const nowStr = formatUtcForIcs(new Date())

  const escapeIcs = (str: string) =>
    str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ruhuna Hockey//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:event-${event.id}@ruhuna-hockey`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `LOCATION:${escapeIcs(event.location || 'University of Ruhuna')}`,
    `DESCRIPTION:${escapeIcs(
      (event.description || '') +
        (event.registration_url ? `\n\nRegistration link: ${event.registration_url}` : '')
    )}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  const icsContent = lines.join('\r\n')
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ruhuna-${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function getRelativeDaysLabel(iso: string): string {
  const target = new Date(iso)
  const now = new Date()
  const diffTime = target.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return `in ${diffDays} days`
}

function formatEventDateRange(startIso: string, endIso?: string | null): string {
  if (!startIso) return ''
  const startDay = fmtDate(startIso)
  const startTime = fmtTime(startIso)

  if (!endIso) {
    return `${startDay} at ${startTime}`
  }

  const endDay = fmtDate(endIso)
  const endTime = fmtTime(endIso)

  if (startDay === endDay) {
    return `${startDay} · ${startTime} – ${endTime}`
  }
  return `${startDay} (${startTime}) – ${endDay} (${endTime})`
}

// Framer Motion hover variants for grid cards
const cardVariants = {
  rest: { y: 0, boxShadow: '0 10px 30px rgba(0,0,0,0.35)' },
  hover: { y: -7, boxShadow: '0 20px 45px rgba(0,0,0,0.55)' },
}

const bannerVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.06 },
}

export default function Events() {
  const { user } = useAuth()

  // 1. Events Data
  const {
    rows: events,
    loading: eventsLoading,
    error: eventsError,
    add: addEvent,
    update: updateEvent,
    remove: removeEvent,
  } = useTable<EventItem>('events', { orderBy: 'start_at', ascending: false })

  // 2. Filters & Tabs State
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Past'>('Upcoming')
  const [typeFilter, setTypeFilter] = useState<'All' | 'Organizing' | 'Participating'>('All')

  // Partition events into Upcoming and Past based on start_at / end_at
  const upcomingEvents = useMemo(() => {
    const currentMs = Date.now()
    return events
      .filter((e) => {
        const threshold = e.end_at ? new Date(e.end_at).getTime() : new Date(e.start_at).getTime()
        // If the event ends (or starts) after now (with 1-hour grace window), it's upcoming
        return threshold >= currentMs - 60 * 60 * 1000
      })
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  }, [events])

  const pastEvents = useMemo(() => {
    const currentMs = Date.now()
    return events
      .filter((e) => {
        const threshold = e.end_at ? new Date(e.end_at).getTime() : new Date(e.start_at).getTime()
        return threshold < currentMs - 60 * 60 * 1000
      })
      .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())
  }, [events])

  // Counts for filter chips
  const currentTabList = activeTab === 'Upcoming' ? upcomingEvents : pastEvents
  const typeCounts = useMemo(() => {
    return {
      All: currentTabList.length,
      Organizing: currentTabList.filter((e) => e.event_type === 'Organizing').length,
      Participating: currentTabList.filter((e) => e.event_type === 'Participating').length,
    }
  }, [currentTabList])

  const filteredList = useMemo(() => {
    if (typeFilter === 'All') return currentTabList
    return currentTabList.filter((e) => e.event_type === typeFilter)
  }, [currentTabList, typeFilter])

  // In Upcoming tab, the soonest upcoming event is the "Featured Event"
  const featuredEvent = activeTab === 'Upcoming' ? filteredList[0] ?? null : null
  const gridEvents = activeTab === 'Upcoming' ? filteredList.slice(1) : filteredList

  // 3. Modals State
  // (a) Details Modal
  const [viewingEvent, setViewingEvent] = useState<EventItem | null>(null)

  // (b) Add / Edit Modal (Admin)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formType, setFormType] = useState<EventItem['event_type']>('Organizing')
  const [formLocation, setFormLocation] = useState('')
  const [formStartAt, setFormStartAt] = useState<string>(
    new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
  )
  const [formEndAt, setFormEndAt] = useState<string>('')
  const [formDescription, setFormDescription] = useState('')
  const [formRegUrl, setFormRegUrl] = useState('')
  const [formBannerUrl, setFormBannerUrl] = useState<string | null>(null)
  const [savingEvent, setSavingEvent] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // (c) Delete Confirm Dialog
  const [deletingEvent, setDeletingEvent] = useState<EventItem | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  // Handlers
  const openAddModal = () => {
    setEditingEvent(null)
    setFormTitle('')
    setFormType('Organizing')
    setFormLocation('')
    // Default start to 7 days from now at 15:00
    const defaultDate = new Date(Date.now() + 7 * 24 * 3600 * 1000)
    defaultDate.setHours(15, 0, 0, 0)
    setFormStartAt(defaultDate.toISOString())
    setFormEndAt('')
    setFormDescription('')
    setFormRegUrl('')
    setFormBannerUrl(null)
    setFormError(null)
    setIsFormOpen(true)
  }

  const openEditModal = (event: EventItem) => {
    setEditingEvent(event)
    setFormTitle(event.title)
    setFormType(event.event_type)
    setFormLocation(event.location ?? '')
    setFormStartAt(event.start_at)
    setFormEndAt(event.end_at ?? '')
    setFormDescription(event.description ?? '')
    setFormRegUrl(event.registration_url ?? '')
    setFormBannerUrl(event.banner_url)
    setFormError(null)
    setIsFormOpen(true)
  }

  const handleSaveEvent = async (e: FormEvent) => {
    e.preventDefault()
    setSavingEvent(true)
    setFormError(null)

    if (!formTitle.trim()) {
      setFormError('Please provide an event title.')
      setSavingEvent(false)
      return
    }

    if (!formStartAt) {
      setFormError('Start date & time is required.')
      setSavingEvent(false)
      return
    }

    // Validate end_at > start_at if provided
    if (formEndAt) {
      if (new Date(formEndAt).getTime() <= new Date(formStartAt).getTime()) {
        setFormError('End date & time must be after the start date & time.')
        setSavingEvent(false)
        return
      }
    }

    // Validate registration URL (must be valid http/https)
    let cleanRegUrl: string | null = null
    const rawUrl = formRegUrl.trim()
    if (rawUrl) {
      const urlCandidate = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
      try {
        const parsed = new URL(urlCandidate)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          setFormError('Registration URL must start with http:// or https://')
          setSavingEvent(false)
          return
        }
        cleanRegUrl = parsed.href
      } catch {
        setFormError('Please enter a valid Registration URL (e.g. https://forms.gle/...)')
        setSavingEvent(false)
        return
      }
    }

    const payload = {
      title: formTitle.trim(),
      event_type: formType,
      location: formLocation.trim() || null,
      start_at: formStartAt,
      end_at: formEndAt || null,
      description: formDescription.trim() || null,
      registration_url: cleanRegUrl,
      banner_url: formBannerUrl,
    }

    let err: string | null = null
    if (editingEvent) {
      err = await updateEvent(editingEvent.id, payload)
    } else {
      err = await addEvent(payload)
    }

    if (err) {
      setFormError(err)
      setSavingEvent(false)
    } else {
      setSavingEvent(false)
      setIsFormOpen(false)
      setEditingEvent(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingEvent) return
    setDeletingBusy(true)
    const err = await removeEvent(deletingEvent.id)
    if (!err && deletingEvent.banner_url) {
      await deleteImageByUrl(deletingEvent.banner_url)
    }
    setDeletingBusy(false)
    setDeletingEvent(null)
  }

  return (
    <SectionShell
      id="events"
      eyebrow="What's On"
      title="Events"
      addLabel="Add event"
      onAdd={user ? openAddModal : undefined}
    >
      {/* 1. TOGGLE + FILTER ROW */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '36px',
        }}
      >
        {/* Segmented Control: Upcoming | Past */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '999px',
            padding: '4px',
            gap: '4px',
            border: `1px solid ${colors.glassBorder}`,
          }}
        >
          {(['Upcoming', 'Past'] as const).map((tab) => {
            const isSelected = activeTab === tab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 22px',
                  borderRadius: '999px',
                  background: isSelected ? colors.orange : 'transparent',
                  color: isSelected ? colors.deepNavy : '#ffffff',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '13.5px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: fonts.body,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isSelected ? '0 2px 10px rgba(247,148,29,0.3)' : 'none',
                }}
              >
                {tab}
              </button>
            )
          })}
        </div>

        {/* Chips: All · Organizing · Participating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {(['All', 'Organizing', 'Participating'] as const).map((type) => {
            const isSelected = typeFilter === type
            const count = typeCounts[type]
            return (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(type)}
                style={{
                  padding: '7px 18px',
                  borderRadius: '999px',
                  background: isSelected ? colors.orange : 'rgba(255,255,255,0.05)',
                  color: isSelected ? colors.deepNavy : colors.grey,
                  fontWeight: isSelected ? 700 : 500,
                  border: isSelected ? 'none' : `1px solid ${colors.glassBorder}`,
                  fontSize: '13px',
                  fontFamily: fonts.body,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 2px 10px rgba(247,148,29,0.25)' : 'none',
                }}
              >
                {type} <span style={{ opacity: isSelected ? 0.85 : 0.65 }}>({count})</span>
              </button>
            )
          })}
        </div>
      </div>

      {eventsError ? (
        <EmptyState message={`Failed to load events: ${eventsError}`} />
      ) : eventsLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            style={{
              height: '320px',
              borderRadius: '24px',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${colors.glassBorder}`,
            }}
          />
        </div>
      ) : filteredList.length === 0 ? (
        <EmptyState
          message={
            activeTab === 'Upcoming'
              ? typeFilter === 'All'
                ? 'No upcoming events scheduled right now. Check back soon for tournaments, clinics, and tryouts!'
                : `No upcoming ${typeFilter.toLowerCase()} events scheduled right now.`
              : typeFilter === 'All'
                ? 'No past events recorded in the archives yet.'
                : `No past ${typeFilter.toLowerCase()} events found.`
          }
        />
      ) : (
        <div>
          {/* 2. FEATURED EVENT (Upcoming tab only) */}
          {featuredEvent && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              whileHover={{ y: -4 }}
              onClick={() => setViewingEvent(featuredEvent)}
              style={{
                position: 'relative',
                borderRadius: '24px',
                overflow: 'hidden',
                marginBottom: '40px',
                border: `1px solid rgba(247,148,29,0.45)`,
                background: `linear-gradient(135deg, ${colors.deepNavy}, ${colors.ink})`,
                boxShadow: '0 20px 60px rgba(0,0,0,0.65), 0 0 35px rgba(247,148,29,0.18)',
                cursor: 'pointer',
              }}
            >
              {/* Background Banner image with navy gradient overlay */}
              {featuredEvent.banner_url ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${featuredEvent.banner_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'brightness(0.65)',
                  }}
                />
              ) : (
                /* Fallback decorative pattern if no banner */
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: '60px',
                    pointerEvents: 'none',
                  }}
                >
                  <svg width="340" height="340" viewBox="0 0 24 24" fill="none" stroke={colors.orange} strokeWidth="1">
                    <path d="M5 3l8 13c1 1.6 3 2 4.6 1s2-3 1-4.6L12 3" />
                    <circle cx="8" cy="18" r="2.5" fill={colors.orange} />
                  </svg>
                </div>
              )}

              {/* Navy Gradient Overlay for readability */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(11,13,38,0.4) 0%, rgba(11,13,38,0.92) 80%, #0b0d26 100%)',
                }}
              />

              {/* Content */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  padding: 'clamp(26px, 4.5vw, 44px)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  minHeight: '340px',
                }}
              >
                {/* Admin Row Actions */}
                {user && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: '22px',
                      right: '22px',
                      zIndex: 10,
                    }}
                  >
                    <RowActions
                      onEdit={() => openEditModal(featuredEvent)}
                      onDelete={() => setDeletingEvent(featuredEvent)}
                    />
                  </div>
                )}

                {/* Top Badges */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap',
                    marginBottom: '14px',
                  }}
                >
                  {/* Type badge: orange fill = Organizing, outlined = Participating */}
                  <span
                    style={{
                      padding: '4px 14px',
                      borderRadius: '999px',
                      background:
                        featuredEvent.event_type === 'Organizing' ? colors.orange : 'transparent',
                      color:
                        featuredEvent.event_type === 'Organizing' ? colors.deepNavy : '#ffffff',
                      border:
                        featuredEvent.event_type === 'Organizing'
                          ? 'none'
                          : `1.5px solid rgba(255,255,255,0.7)`,
                      fontSize: '11.5px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      fontFamily: fonts.body,
                    }}
                  >
                    {featuredEvent.event_type}
                  </span>

                  {/* "in N days" small label */}
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '999px',
                      background: 'rgba(255,255,255,0.08)',
                      color: colors.orange,
                      border: `1px solid rgba(247,148,29,0.35)`,
                      fontSize: '12px',
                      fontWeight: 700,
                      fontFamily: fonts.body,
                    }}
                  >
                    {getRelativeDaysLabel(featuredEvent.start_at)}
                  </span>
                </div>

                <h3
                  style={{
                    fontFamily: fonts.heading,
                    fontWeight: 700,
                    fontSize: 'clamp(1.75rem, 3.5vw, 2.6rem)',
                    color: '#ffffff',
                    lineHeight: 1.18,
                    margin: '0 0 10px',
                    maxWidth: '850px',
                  }}
                >
                  {featuredEvent.title}
                </h3>

                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: '14.5px',
                    color: colors.grey,
                    margin: '0 0 16px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <span>🗓️ {formatEventDateRange(featuredEvent.start_at, featuredEvent.end_at)}</span>
                  {featuredEvent.location && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      📍 {featuredEvent.location}
                    </span>
                  )}
                </p>

                {featuredEvent.description && (
                  <p
                    style={{
                      fontFamily: fonts.body,
                      fontSize: '14.5px',
                      lineHeight: 1.6,
                      color: colors.textSoft,
                      maxWidth: '750px',
                      margin: '0 0 24px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {featuredEvent.description}
                  </p>
                )}

                {/* Actions: Register orange button + Add to calendar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {featuredEvent.registration_url && (
                    <a
                      href={featuredEvent.registration_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        padding: '11px 24px',
                        borderRadius: '999px',
                        background: colors.orange,
                        color: colors.deepNavy,
                        fontSize: '14px',
                        fontWeight: 700,
                        fontFamily: fonts.body,
                        textDecoration: 'none',
                        boxShadow: '0 4px 18px rgba(247,148,29,0.35)',
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      Register Now →
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      downloadEventIcs(featuredEvent)
                    }}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '999px',
                      background: 'rgba(255,255,255,0.08)',
                      border: `1px solid ${colors.glassBorder}`,
                      color: '#ffffff',
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      fontFamily: fonts.body,
                    }}
                  >
                    📅 Add to calendar (.ics)
                  </button>

                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: '13px',
                      color: colors.orange,
                      fontFamily: fonts.body,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    Full details & info ↗
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* 3. EVENT GRID FOR THE REST */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
              gap: '24px',
            }}
          >
            {gridEvents.map((event) => {
              const isPast = activeTab === 'Past'
              const isOrganizing = event.event_type === 'Organizing'

              return (
                <motion.div
                  key={event.id}
                  initial="rest"
                  whileHover="hover"
                  animate="rest"
                  variants={cardVariants}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  onClick={() => setViewingEvent(event)}
                  style={{
                    position: 'relative',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${colors.glassBorder}`,
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                  }}
                >
                  {/* Admin Row Actions */}
                  {user && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        zIndex: 10,
                      }}
                    >
                      <RowActions
                        onEdit={() => openEditModal(event)}
                        onDelete={() => setDeletingEvent(event)}
                      />
                    </div>
                  )}

                  {/* 16:9 Banner container with hover zoom */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '16 / 9',
                      overflow: 'hidden',
                      background: `linear-gradient(135deg, ${colors.deepNavy}, ${colors.navy})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {event.banner_url ? (
                      <motion.img
                        variants={bannerVariants}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        src={event.banner_url}
                        alt={event.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          filter: isPast ? 'grayscale(45%) contrast(95%)' : 'none',
                        }}
                      />
                    ) : (
                      /* Inline Hockey Sticks & Ball SVG Fallback */
                      <motion.div
                        variants={bannerVariants}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          background: `linear-gradient(135deg, ${colors.deepNavy}, ${colors.navy})`,
                          filter: isPast ? 'grayscale(45%)' : 'none',
                        }}
                      >
                        <svg
                          width="44"
                          height="44"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={colors.orange}
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 3l8 13c1 1.6 3 2 4.6 1s2-3 1-4.6L12 3" />
                          <circle cx="8" cy="18" r="2.5" fill={colors.orange} />
                        </svg>
                        <span style={{ fontSize: '11px', fontFamily: fonts.body, color: colors.textSoft }}>
                          Ruhuna Hockey
                        </span>
                      </motion.div>
                    )}

                    {/* Gradient shade over banner bottom for contrast */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                          'linear-gradient(180deg, rgba(11,13,38,0.2) 0%, rgba(11,13,38,0.8) 100%)',
                        pointerEvents: 'none',
                      }}
                    />

                    {/* Floating Date Chip (day + month) */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        borderRadius: '12px',
                        background: 'rgba(11,13,38,0.85)',
                        border: `1px solid ${colors.glassBorder}`,
                        padding: '6px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                        pointerEvents: 'none',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: fonts.heading,
                          fontWeight: 800,
                          fontSize: '18px',
                          color: '#ffffff',
                          lineHeight: 1,
                        }}
                      >
                        {fmtDay(event.start_at)}
                      </span>
                      <span
                        style={{
                          fontFamily: fonts.body,
                          fontWeight: 700,
                          fontSize: '10px',
                          color: colors.orange,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {fmtMonth(event.start_at)}
                      </span>
                    </div>

                    {/* Type Badge: orange fill = Organizing, outlined = Participating */}
                    <div style={{ position: 'absolute', bottom: '10px', left: '12px', pointerEvents: 'none' }}>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '999px',
                          background: isOrganizing ? colors.orange : 'transparent',
                          color: isOrganizing ? colors.deepNavy : '#ffffff',
                          border: isOrganizing ? 'none' : `1.5px solid rgba(255,255,255,0.7)`,
                          fontSize: '10.5px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          fontFamily: fonts.body,
                          backdropFilter: isOrganizing ? 'none' : 'blur(6px)',
                          WebkitBackdropFilter: isOrganizing ? 'none' : 'blur(6px)',
                        }}
                      >
                        {event.event_type}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div
                    style={{
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <h4
                        style={{
                          fontFamily: fonts.heading,
                          fontWeight: 600,
                          fontSize: '17px',
                          color: '#ffffff',
                          margin: '0 0 6px',
                          lineHeight: 1.3,
                        }}
                      >
                        {event.title}
                      </h4>

                      {event.location && (
                        <p
                          style={{
                            fontFamily: fonts.body,
                            fontSize: '12.5px',
                            color: colors.textSoft,
                            margin: '0 0 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={colors.orange}
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span>{event.location}</span>
                        </p>
                      )}

                      {event.description && (
                        <p
                          style={{
                            fontFamily: fonts.body,
                            fontSize: '13px',
                            color: colors.grey,
                            lineHeight: 1.5,
                            margin: 0,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {event.description}
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '16px',
                        paddingTop: '12px',
                        borderTop: `1px solid ${colors.glassBorder}`,
                      }}
                    >
                      <span style={{ fontSize: '12px', color: colors.orange, fontFamily: fonts.body }}>
                        {fmtTime(event.start_at)}
                      </span>

                      <span style={{ fontSize: '12px', color: colors.textSoft, fontFamily: fonts.body }}>
                        Details →
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* DETAIL MODAL (Click on Event) */}
      <Modal
        open={!!viewingEvent}
        title={viewingEvent?.title ?? 'Event Details'}
        onClose={() => setViewingEvent(null)}
        width={560}
      >
        {viewingEvent && (
          <div>
            {/* Banner preview */}
            {viewingEvent.banner_url && (
              <div
                style={{
                  width: '100%',
                  aspectRatio: '16 / 9',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  marginBottom: '20px',
                  border: `1px solid ${colors.glassBorder}`,
                }}
              >
                <img
                  src={viewingEvent.banner_url}
                  alt={viewingEvent.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}

            {/* Badges */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: viewingEvent.event_type === 'Organizing' ? colors.orange : 'transparent',
                  color: viewingEvent.event_type === 'Organizing' ? colors.deepNavy : '#ffffff',
                  border:
                    viewingEvent.event_type === 'Organizing'
                      ? 'none'
                      : `1.5px solid rgba(255,255,255,0.7)`,
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                }}
              >
                {viewingEvent.event_type}
              </span>

              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.06)',
                  color: colors.orange,
                  fontSize: '11.5px',
                  fontWeight: 600,
                  border: `1px solid rgba(247,148,29,0.3)`,
                }}
              >
                {getRelativeDaysLabel(viewingEvent.start_at)}
              </span>
            </div>

            <h3
              style={{
                fontFamily: fonts.heading,
                fontSize: '22px',
                fontWeight: 600,
                color: '#fff',
                margin: '0 0 10px',
              }}
            >
              {viewingEvent.title}
            </h3>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '16px',
                fontSize: '13.5px',
                color: colors.grey,
              }}
            >
              <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🗓️</span>
                <span>
                  {formatEventDateRange(viewingEvent.start_at, viewingEvent.end_at)} (Sri Lanka Time)
                </span>
              </p>
              {viewingEvent.location && (
                <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📍</span>
                  <span>{viewingEvent.location}</span>
                </p>
              )}
            </div>

            {viewingEvent.description && (
              <div
                style={{
                  padding: '14px 0',
                  borderTop: `1px solid ${colors.glassBorder}`,
                  borderBottom: `1px solid ${colors.glassBorder}`,
                  marginBottom: '20px',
                }}
              >
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: '14px',
                    lineHeight: 1.65,
                    color: 'rgba(255,255,255,0.85)',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {viewingEvent.description}
                </p>
              </div>
            )}

            {/* Actions: Add to calendar (.ics) and Register button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                flexWrap: 'wrap',
                marginTop: '10px',
              }}
            >
              <button
                type="button"
                onClick={() => downloadEventIcs(viewingEvent)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.08)',
                  border: `1px solid ${colors.glassBorder}`,
                  color: '#ffffff',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontFamily: fonts.body,
                  transition: 'background 0.2s',
                }}
              >
                📅 Add to calendar (.ics)
              </button>

              {viewingEvent.registration_url && (
                <a
                  href={viewingEvent.registration_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '10px 22px',
                    borderRadius: '999px',
                    background: colors.orange,
                    color: colors.deepNavy,
                    fontSize: '13.5px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontFamily: fonts.body,
                    boxShadow: '0 4px 14px rgba(247,148,29,0.3)',
                  }}
                >
                  Register Online →
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ADD / EDIT MODAL (Admin) */}
      <Modal
        open={isFormOpen}
        title={editingEvent ? 'Edit Event' : 'Add Event'}
        onClose={() => setIsFormOpen(false)}
        width={560}
      >
        <form onSubmit={handleSaveEvent}>
          <Field label="Event Title">
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              style={inputStyle}
              placeholder="e.g. Ruhuna Hockey Colours Night & Tryouts"
            />
          </Field>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
            }}
          >
            <Field label="Event Type">
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as EventItem['event_type'])}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="Organizing" style={{ background: colors.deepNavy }}>
                  Organizing
                </option>
                <option value="Participating" style={{ background: colors.deepNavy }}>
                  Participating
                </option>
              </select>
            </Field>

            <Field label="Location">
              <input
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                style={inputStyle}
                placeholder="e.g. UOR Gymnasium, Matara"
              />
            </Field>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
            }}
          >
            <Field label="Start Date & Time (SL Time)">
              <input
                type="datetime-local"
                required
                value={toLocalInput(formStartAt)}
                onChange={(e) => {
                  const iso = fromLocalInput(e.target.value)
                  if (iso) setFormStartAt(iso)
                }}
                style={inputStyle}
              />
            </Field>

            <Field label="End Date & Time (Optional)">
              <input
                type="datetime-local"
                value={toLocalInput(formEndAt)}
                onChange={(e) => {
                  const iso = fromLocalInput(e.target.value)
                  setFormEndAt(iso ?? '')
                }}
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Registration URL (Optional)" hint="External link for Google Forms, ticketing, etc.">
            <input
              type="text"
              value={formRegUrl}
              onChange={(e) => setFormRegUrl(e.target.value)}
              style={inputStyle}
              placeholder="https://forms.gle/..."
            />
          </Field>

          <Field label="Description (Optional)">
            <textarea
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Event agenda, requirements, registration fees, contact person..."
            />
          </Field>

          <ImageUpload
            label="Event Banner"
            value={formBannerUrl}
            onChange={setFormBannerUrl}
            folder="events"
            shape="wide"
          />

          <FormError message={formError} />

          <FormActions
            onCancel={() => setIsFormOpen(false)}
            saving={savingEvent}
            submitLabel={editingEvent ? 'Update Event' : 'Create Event'}
          />
        </form>
      </Modal>

      {/* CONFIRM DELETE DIALOG (Admin) */}
      <ConfirmDialog
        open={!!deletingEvent}
        message={`Are you sure you want to delete the event "${deletingEvent?.title}"? This action cannot be undone.`}
        busy={deletingBusy}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeletingEvent(null)}
      />
    </SectionShell>
  )
}
