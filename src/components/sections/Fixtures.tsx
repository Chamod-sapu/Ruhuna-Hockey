import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SectionShell from '../ui/SectionShell'
import Modal from '../ui/Modal'
import { Field, FormError, FormActions, inputStyle } from '../ui/FormFields'
import ConfirmDialog from '../ui/ConfirmDialog'
import RowActions from '../ui/RowActions'
import EmptyState from '../ui/EmptyState'
import { useTable } from '../../hooks/useTable'
import { colors, fonts } from '../../lib/theme'
import { useAuth } from '../../context/AuthContext'
import { fmtDate, fmtTime, fmtDay, fmtMonth, toLocalInput, fromLocalInput } from '../../lib/format'
import { FIXTURE_STATUSES, type Fixture, type Tournament } from '../../lib/types'

function getInitials(name: string): string {
  if (!name) return 'OP'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatUtcForIcs(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function downloadIcs(fixture: Fixture, tournamentName?: string | null) {
  const startDate = new Date(fixture.match_at)
  const endDate = new Date(startDate.getTime() + 90 * 60 * 1000) // 90-minute match
  const startStr = formatUtcForIcs(startDate)
  const endStr = formatUtcForIcs(endDate)
  const nowStr = formatUtcForIcs(new Date())

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ruhuna Hockey//Match Day//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:fixture-${fixture.id}@ruhuna-hockey`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:Ruhuna Hockey vs ${fixture.opponent}`,
    `LOCATION:${(fixture.venue || 'TBA').replace(/,/g, '\\,')}`,
    `DESCRIPTION:Ruhuna Hockey vs ${fixture.opponent} (${fixture.home_away} match)${tournamentName ? ` - ${tournamentName}` : ''}${fixture.notes ? `\\n\\nNotes: ${fixture.notes}` : ''}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  const icsContent = lines.join('\r\n')
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ruhuna-vs-${fixture.opponent.toLowerCase().replace(/[^a-z0-9]/g, '-')}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Live Countdown Component for Next Match
function LiveCountdown({ targetIso }: { targetIso: string }) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calculate = () => {
      const diff = Math.max(0, new Date(targetIso).getTime() - Date.now())
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      })
    }

    calculate()
    const interval = setInterval(calculate, 1000)
    return () => clearInterval(interval)
  }, [targetIso])

  const digits = [
    { label: 'Days', val: timeLeft.days },
    { label: 'Hours', val: timeLeft.hours },
    { label: 'Mins', val: timeLeft.minutes },
    { label: 'Secs', val: timeLeft.seconds },
  ]

  return (
    <div
      role="timer"
      aria-live="off"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
      }}
    >
      {digits.map((item, idx) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 'clamp(52px, 8vw, 68px)',
                height: 'clamp(52px, 8vw, 68px)',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${colors.glassBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: fonts.heading,
                fontWeight: 700,
                fontSize: 'clamp(1.4rem, 2.5vw, 1.85rem)',
                color: colors.orange,
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              }}
            >
              {String(item.val).padStart(2, '0')}
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: colors.textSoft,
                marginTop: '4px',
                fontFamily: fonts.body,
              }}
            >
              {item.label}
            </span>
          </div>
          {idx < digits.length - 1 && (
            <span
              style={{
                fontFamily: fonts.heading,
                fontWeight: 700,
                fontSize: '20px',
                color: colors.orange,
                opacity: 0.6,
                marginBottom: '16px',
              }}
            >
              :
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

export default function Fixtures() {
  const { user } = useAuth()

  // 1. Fixtures Table
  const {
    rows: fixtures,
    loading: fixturesLoading,
    error: fixturesError,
    add: addFixture,
    update: updateFixture,
    remove: removeFixture,
  } = useTable<Fixture>('fixtures', { orderBy: 'match_at', ascending: false })

  // 2. Tournaments Table (for mapping tournament names and dropdowns)
  const { rows: tournaments } = useTable<Tournament>('tournaments', { orderBy: 'season_year', ascending: false })

  const tournamentMap = useMemo(() => {
    return Object.fromEntries(tournaments.map((t) => [t.id, t.name]))
  }, [tournaments])

  // 3. Next Match Hero Card Calculation
  const nextMatch = useMemo(() => {
    const now = Date.now()
    const candidates = fixtures.filter((f) => {
      if (f.status === 'Live') return true
      if (f.status === 'Upcoming') {
        // Match in future, or started within the past 2.5 hours
        return new Date(f.match_at).getTime() >= now - 2.5 * 3600 * 1000
      }
      return false
    })
    return candidates.sort((a, b) => new Date(a.match_at).getTime() - new Date(b.match_at).getTime())[0] ?? null
  }, [fixtures])

  // 4. Tabs & Filter State
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Results' | 'All'>('Upcoming')
  const [selectedTournamentFilter, setSelectedTournamentFilter] = useState<string>('ALL')

  // Filtered fixtures list
  const filteredFixtures = useMemo(() => {
    let list = fixtures
    if (selectedTournamentFilter !== 'ALL') {
      list = list.filter((f) => f.tournament_id === selectedTournamentFilter)
    }

    if (activeTab === 'Upcoming') {
      return list
        .filter((f) => f.status === 'Upcoming' || f.status === 'Live')
        .sort((a, b) => new Date(a.match_at).getTime() - new Date(b.match_at).getTime())
    }
    if (activeTab === 'Results') {
      return list
        .filter((f) => f.status === 'Completed')
        .sort((a, b) => new Date(b.match_at).getTime() - new Date(a.match_at).getTime())
    }
    // 'All' tab: descending by match_at
    return [...list].sort((a, b) => new Date(b.match_at).getTime() - new Date(a.match_at).getTime())
  }, [fixtures, selectedTournamentFilter, activeTab])

  // Expanded notes toggle state (by fixture ID)
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})
  const toggleNotes = (id: string) => {
    setExpandedNotes((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // 5. Admin Modals State
  // (a) Full Match Modal (Add / Edit)
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false)
  const [editingFixture, setEditingFixture] = useState<Fixture | null>(null)
  const [formTournamentId, setFormTournamentId] = useState<string>('')
  const [formOpponent, setFormOpponent] = useState('')
  const [formVenue, setFormVenue] = useState('')
  const [formMatchAt, setFormMatchAt] = useState<string>(new Date().toISOString())
  const [formHomeAway, setFormHomeAway] = useState<'Home' | 'Away' | 'Neutral'>('Home')
  const [formStatus, setFormStatus] = useState<Fixture['status']>('Upcoming')
  const [formOurScore, setFormOurScore] = useState<number | ''>('')
  const [formOpponentScore, setFormOpponentScore] = useState<number | ''>('')
  const [formNotes, setFormNotes] = useState('')
  const [savingMatch, setSavingMatch] = useState(false)
  const [matchFormError, setMatchFormError] = useState<string | null>(null)

  // (b) Quick Result Modal
  const [resultModalFixture, setResultModalFixture] = useState<Fixture | null>(null)
  const [quickOurScore, setQuickOurScore] = useState<number | ''>('')
  const [quickOpponentScore, setQuickOpponentScore] = useState<number | ''>('')
  const [savingResult, setSavingResult] = useState(false)
  const [resultFormError, setResultFormError] = useState<string | null>(null)

  // (c) Delete Confirm Dialog
  const [deletingFixture, setDeletingFixture] = useState<Fixture | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  // Handlers
  const openAddMatchModal = () => {
    setEditingFixture(null)
    setFormTournamentId('')
    setFormOpponent('')
    setFormVenue('')
    setFormMatchAt(new Date(Date.now() + 24 * 3600 * 1000).toISOString())
    setFormHomeAway('Home')
    setFormStatus('Upcoming')
    setFormOurScore('')
    setFormOpponentScore('')
    setFormNotes('')
    setMatchFormError(null)
    setIsMatchModalOpen(true)
  }

  const openEditMatchModal = (f: Fixture) => {
    setEditingFixture(f)
    setFormTournamentId(f.tournament_id ?? '')
    setFormOpponent(f.opponent)
    setFormVenue(f.venue ?? '')
    setFormMatchAt(f.match_at)
    setFormHomeAway(f.home_away)
    setFormStatus(f.status)
    setFormOurScore(f.our_score ?? '')
    setFormOpponentScore(f.opponent_score ?? '')
    setFormNotes(f.notes ?? '')
    setMatchFormError(null)
    setIsMatchModalOpen(true)
  }

  const handleSaveMatch = async (e: FormEvent) => {
    e.preventDefault()
    setSavingMatch(true)
    setMatchFormError(null)

    if (formStatus === 'Completed') {
      if (formOurScore === '' || formOpponentScore === '') {
        setMatchFormError('Both scores are required when match status is Completed.')
        setSavingMatch(false)
        return
      }
    }

    const payload = {
      tournament_id: formTournamentId || null,
      opponent: formOpponent.trim(),
      venue: formVenue.trim() || null,
      match_at: formMatchAt,
      home_away: formHomeAway,
      status: formStatus,
      our_score: formStatus === 'Completed' ? Number(formOurScore) : null,
      opponent_score: formStatus === 'Completed' ? Number(formOpponentScore) : null,
      notes: formNotes.trim() || null,
    }

    let err: string | null = null
    if (editingFixture) {
      err = await updateFixture(editingFixture.id, payload)
    } else {
      err = await addFixture(payload)
    }

    if (err) {
      setMatchFormError(err)
      setSavingMatch(false)
    } else {
      setSavingMatch(false)
      setIsMatchModalOpen(false)
      setEditingFixture(null)
    }
  }

  const openQuickResultModal = (f: Fixture) => {
    setResultModalFixture(f)
    setQuickOurScore(f.our_score ?? '')
    setQuickOpponentScore(f.opponent_score ?? '')
    setResultFormError(null)
  }

  const handleSaveQuickResult = async (e: FormEvent) => {
    e.preventDefault()
    if (!resultModalFixture) return
    if (quickOurScore === '' || quickOpponentScore === '') {
      setResultFormError('Please enter both scores.')
      return
    }

    setSavingResult(true)
    setResultFormError(null)

    const err = await updateFixture(resultModalFixture.id, {
      our_score: Number(quickOurScore),
      opponent_score: Number(quickOpponentScore),
      status: 'Completed',
    })

    if (err) {
      setResultFormError(err)
      setSavingResult(false)
    } else {
      setSavingResult(false)
      setResultModalFixture(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingFixture) return
    setDeletingBusy(true)
    await removeFixture(deletingFixture.id)
    setDeletingBusy(false)
    setDeletingFixture(null)
  }

  return (
    <SectionShell
      id="fixtures"
      eyebrow="Match Day"
      title="Fixtures & Results"
      addLabel="Add match"
      onAdd={user ? openAddMatchModal : undefined}
    >
      {/* 1. NEXT MATCH HERO CARD */}
      <div style={{ marginBottom: '56px' }}>
        {nextMatch ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              position: 'relative',
              background: 'linear-gradient(135deg, rgba(28,31,74,0.75) 0%, rgba(11,13,38,0.92) 100%)',
              border: `1px solid rgba(247,148,29,0.35)`,
              borderRadius: '24px',
              padding: 'clamp(24px, 4vw, 36px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 35px rgba(247,148,29,0.15)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              overflow: 'hidden',
            }}
          >
            {/* Ambient Glow */}
            <div
              style={{
                position: 'absolute',
                top: '-80px',
                right: '-80px',
                width: '300px',
                height: '300px',
                background: 'radial-gradient(circle, rgba(247,148,29,0.2) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                marginBottom: '26px',
                position: 'relative',
                zIndex: 2,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    fontFamily: fonts.body,
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: colors.orange,
                    background: 'rgba(247,148,29,0.12)',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    border: '1px solid rgba(247,148,29,0.3)',
                  }}
                >
                  Next Match
                </span>
                {nextMatch.tournament_id && tournamentMap[nextMatch.tournament_id] && (
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: '12px',
                      color: colors.grey,
                      background: 'rgba(255,255,255,0.06)',
                      padding: '4px 12px',
                      borderRadius: '999px',
                    }}
                  >
                    🏆 {tournamentMap[nextMatch.tournament_id]}
                  </span>
                )}
                <span
                  style={{
                    fontFamily: fonts.body,
                    fontSize: '11px',
                    color: colors.textSoft,
                    background: 'rgba(255,255,255,0.06)',
                    padding: '4px 10px',
                    borderRadius: '999px',
                  }}
                >
                  {nextMatch.home_away}
                </span>
              </div>

              {/* Add to calendar button */}
              <button
                type="button"
                onClick={() => downloadIcs(nextMatch, tournamentMap[nextMatch.tournament_id ?? ''])}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.08)',
                  border: `1px solid ${colors.glassBorder}`,
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontFamily: fonts.body,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                📅 Add to calendar
              </button>
            </div>

            {/* Matchup Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '30px',
                alignItems: 'center',
                position: 'relative',
                zIndex: 2,
              }}
            >
              {/* Match Details */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                  {/* Ruhuna Logo */}
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '999px',
                      background: '#fff',
                      padding: '2px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    }}
                  >
                    <img src="/logo.png" alt="Ruhuna" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '999px' }} />
                  </div>
                  <span style={{ fontFamily: fonts.heading, fontSize: '18px', fontWeight: 700, color: colors.orange }}>
                    VS
                  </span>
                  {/* Opponent Circle */}
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '999px',
                      background: colors.navy,
                      border: `1px solid ${colors.glassBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: fonts.heading,
                      fontWeight: 700,
                      fontSize: '16px',
                      color: '#ffffff',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    }}
                  >
                    {getInitials(nextMatch.opponent)}
                  </div>
                </div>

                <h3
                  style={{
                    fontFamily: fonts.heading,
                    fontWeight: 700,
                    fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)',
                    color: '#ffffff',
                    margin: '0 0 10px',
                    lineHeight: 1.15,
                  }}
                >
                  Ruhuna Hockey <span style={{ color: colors.orange }}>vs</span> {nextMatch.opponent}
                </h3>

                <p style={{ fontFamily: fonts.body, fontSize: '14.5px', color: colors.grey, margin: '0 0 4px' }}>
                  🗓️ {fmtDate(nextMatch.match_at)} at {fmtTime(nextMatch.match_at)} (Sri Lanka Time)
                </p>
                {nextMatch.venue && (
                  <p style={{ fontFamily: fonts.body, fontSize: '13.5px', color: colors.textSoft, margin: 0 }}>
                    📍 {nextMatch.venue}
                  </p>
                )}
              </div>

              {/* Countdown or LIVE badge */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                }}
              >
                {nextMatch.status === 'Live' ? (
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: colors.orange,
                      color: colors.deepNavy,
                      padding: '10px 24px',
                      borderRadius: '999px',
                      fontFamily: fonts.heading,
                      fontWeight: 800,
                      fontSize: '15px',
                      letterSpacing: '0.08em',
                    }}
                  >
                    <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: colors.deepNavy }} />
                    MATCH IN PROGRESS
                  </motion.div>
                ) : (
                  <div>
                    <span
                      style={{
                        display: 'block',
                        fontFamily: fonts.body,
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        color: colors.textSoft,
                        marginBottom: '10px',
                      }}
                    >
                      Kick-off Countdown
                    </span>
                    <LiveCountdown targetIso={nextMatch.match_at} />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <div
            style={{
              padding: '40px 24px',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '20px',
              border: `1px dashed ${colors.glassBorder}`,
              color: colors.textSoft,
              fontFamily: fonts.body,
              fontSize: '14.5px',
            }}
          >
            No upcoming matches scheduled yet.
          </div>
        )}
      </div>

      {/* 2. TABS & TOURNAMENT FILTER STRIP */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {/* Tabs: Upcoming · Results · All */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '999px',
            padding: '4px',
            gap: '4px',
          }}
        >
          {(['Upcoming', 'Results', 'All'] as const).map((tab) => {
            const isSelected = activeTab === tab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '999px',
                  background: isSelected ? colors.orange : 'transparent',
                  color: isSelected ? colors.deepNavy : '#ffffff',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: fonts.body,
                  transition: 'all 0.2s',
                }}
              >
                {tab}
              </button>
            )
          })}
        </div>

        {/* Tournament Filter Select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12.5px', color: colors.textSoft, fontFamily: fonts.body }}>
            Filter:
          </span>
          <select
            value={selectedTournamentFilter}
            onChange={(e) => setSelectedTournamentFilter(e.target.value)}
            style={{
              ...inputStyle,
              width: 'auto',
              minWidth: '180px',
              padding: '8px 14px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <option value="ALL" style={{ background: colors.deepNavy, color: '#fff' }}>
              All Tournaments
            </option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id} style={{ background: colors.deepNavy, color: '#fff' }}>
                {t.name} ({t.season_year})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. FIXTURE ROWS LIST */}
      {fixturesError ? (
        <EmptyState message={`Failed to load fixtures: ${fixturesError}`} />
      ) : fixturesLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              style={{
                height: '92px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${colors.glassBorder}`,
              }}
            />
          ))}
        </div>
      ) : filteredFixtures.length === 0 ? (
        <EmptyState
          message={
            activeTab === 'Upcoming'
              ? 'No upcoming matches found.'
              : activeTab === 'Results'
              ? 'No match results recorded yet.'
              : 'No fixtures match your filter.'
          }
        />
      ) : (
        <motion.div layout style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <AnimatePresence mode="popLayout">
            {filteredFixtures.map((fixture) => {
              const isCompleted = fixture.status === 'Completed'
              const isDimmed = fixture.status === 'Postponed' || fixture.status === 'Cancelled'
              const ourScore = fixture.our_score ?? 0
              const oppScore = fixture.opponent_score ?? 0
              const isWin = ourScore > oppScore
              const isDraw = ourScore === oppScore
              const hasNotes = Boolean(fixture.notes)
              const notesOpen = Boolean(expandedNotes[fixture.id])

              return (
                <motion.div
                  layout
                  key={fixture.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${colors.glassBorder}`,
                    borderRadius: '18px',
                    padding: '18px 22px',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    opacity: isDimmed ? 0.65 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'border 0.2s, box-shadow 0.2s',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '18px',
                    }}
                  >
                    {/* LEFT: Date Block */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        minWidth: '130px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '56px',
                          height: '56px',
                          borderRadius: '12px',
                          background: 'rgba(255,255,255,0.06)',
                          border: `1px solid ${colors.glassBorder}`,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: fonts.heading,
                            fontWeight: 800,
                            fontSize: '22px',
                            color: '#ffffff',
                            lineHeight: 1,
                          }}
                        >
                          {fmtDay(fixture.match_at)}
                        </span>
                        <span
                          style={{
                            fontFamily: fonts.body,
                            fontWeight: 700,
                            fontSize: '10.5px',
                            color: colors.orange,
                            textTransform: 'uppercase',
                          }}
                        >
                          {fmtMonth(fixture.match_at)}
                        </span>
                      </div>

                      <div>
                        <span
                          style={{
                            display: 'block',
                            fontFamily: fonts.body,
                            fontSize: '13px',
                            fontWeight: 500,
                            color: isDimmed ? colors.textSoft : '#ffffff',
                            textDecoration: isDimmed ? 'line-through' : 'none',
                          }}
                        >
                          {fmtTime(fixture.match_at)}
                        </span>
                        <span
                          style={{
                            display: 'block',
                            fontFamily: fonts.body,
                            fontSize: '11.5px',
                            color: colors.textSoft,
                          }}
                        >
                          Sri Lanka Time
                        </span>
                      </div>
                    </div>

                    {/* CENTRE: Matchup & Meta */}
                    <div style={{ flex: '1 1 300px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        {/* Ruhuna Crest */}
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '999px',
                            background: '#fff',
                            padding: '1.5px',
                            flexShrink: 0,
                          }}
                        >
                          <img src="/logo.png" alt="Ruhuna" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '999px' }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: colors.orange }}>vs</span>
                        {/* Opponent Initials */}
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '999px',
                            background: colors.navy,
                            border: `1px solid ${colors.glassBorder}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#fff',
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(fixture.opponent)}
                        </div>
                        <h4
                          style={{
                            fontFamily: fonts.heading,
                            fontWeight: 600,
                            fontSize: '17px',
                            color: '#ffffff',
                            margin: 0,
                          }}
                        >
                          {fixture.opponent}
                        </h4>
                      </div>

                      {/* Venue + Home/Away + Tournament */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px', color: colors.textSoft }}>
                        {fixture.venue && <span>📍 {fixture.venue}</span>}
                        <span
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            color: colors.grey,
                            fontSize: '11px',
                          }}
                        >
                          {fixture.home_away}
                        </span>
                        {fixture.tournament_id && tournamentMap[fixture.tournament_id] && (
                          <span style={{ color: colors.orange }}>
                            🏆 {tournamentMap[fixture.tournament_id]}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* RIGHT: Status / Score & Actions */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        flexWrap: 'wrap',
                        justifyContent: 'flex-end',
                      }}
                    >
                      {isCompleted ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span
                            style={{
                              fontFamily: fonts.heading,
                              fontWeight: 700,
                              fontSize: '22px',
                              color: '#ffffff',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {ourScore} – {oppScore}
                          </span>
                          <span
                            style={{
                              fontFamily: fonts.body,
                              fontWeight: 800,
                              fontSize: '11.5px',
                              letterSpacing: '0.06em',
                              padding: '4px 12px',
                              borderRadius: '999px',
                              background: isWin ? colors.orange : isDraw ? colors.grey : 'transparent',
                              color: isWin || isDraw ? colors.deepNavy : '#ffffff',
                              border: !isWin && !isDraw ? '1px solid rgba(255,255,255,0.4)' : 'none',
                            }}
                          >
                            {isWin ? 'WIN' : isDraw ? 'DRAW' : 'LOSS'}
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontFamily: fonts.body,
                              fontSize: '11.5px',
                              fontWeight: 600,
                              padding: '4px 12px',
                              borderRadius: '999px',
                              background:
                                fixture.status === 'Live'
                                  ? colors.orange
                                  : fixture.status === 'Postponed'
                                  ? 'rgba(247,148,29,0.15)'
                                  : 'rgba(255,255,255,0.08)',
                              color: fixture.status === 'Live' ? colors.deepNavy : '#ffffff',
                              border:
                                fixture.status === 'Postponed'
                                  ? `1px solid ${colors.orange}`
                                  : `1px solid ${colors.glassBorder}`,
                            }}
                          >
                            {fixture.status === 'Live' ? '● LIVE' : fixture.status}
                          </span>

                          {/* Add to calendar button on upcoming/live */}
                          {(fixture.status === 'Upcoming' || fixture.status === 'Live') && (
                            <button
                              type="button"
                              onClick={() => downloadIcs(fixture, tournamentMap[fixture.tournament_id ?? ''])}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '999px',
                                background: 'rgba(255,255,255,0.06)',
                                border: `1px solid ${colors.glassBorder}`,
                                color: colors.grey,
                                fontSize: '11.5px',
                                cursor: 'pointer',
                                fontFamily: fonts.body,
                              }}
                            >
                              📅 Calendar
                            </button>
                          )}
                        </div>
                      )}

                      {/* Admin Quick Action: Enter Result on Upcoming */}
                      {user && fixture.status !== 'Completed' && (
                        <button
                          type="button"
                          onClick={() => openQuickResultModal(fixture)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '999px',
                            background: 'rgba(247,148,29,0.15)',
                            border: `1px solid ${colors.orange}`,
                            color: colors.orange,
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: fonts.body,
                          }}
                        >
                          Enter result
                        </button>
                      )}

                      {/* Notes toggle button */}
                      {hasNotes && (
                        <button
                          type="button"
                          onClick={() => toggleNotes(fixture.id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            background: 'transparent',
                            border: `1px solid ${colors.glassBorder}`,
                            color: colors.textSoft,
                            fontSize: '11.5px',
                            cursor: 'pointer',
                          }}
                        >
                          Notes {notesOpen ? '▲' : '▼'}
                        </button>
                      )}

                      {/* Admin RowActions (Edit / Delete) */}
                      {user && (
                        <RowActions
                          onEdit={() => openEditMatchModal(fixture)}
                          onDelete={() => setDeletingFixture(fixture)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Expandable Notes container */}
                  <AnimatePresence>
                    {hasNotes && notesOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                          overflow: 'hidden',
                          borderTop: `1px dashed ${colors.glassBorder}`,
                          paddingTop: '10px',
                          marginTop: '4px',
                        }}
                      >
                        <p style={{ fontFamily: fonts.body, fontSize: '13px', color: colors.grey, margin: 0, lineHeight: 1.5 }}>
                          📝 {fixture.notes}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* FULL MATCH MODAL (Admin Add / Edit) */}
      <Modal
        open={isMatchModalOpen}
        title={editingFixture ? 'Edit Fixture' : 'Add Match Fixture'}
        onClose={() => setIsMatchModalOpen(false)}
        width={560}
      >
        <form onSubmit={handleSaveMatch}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Opponent Team">
              <input
                type="text"
                required
                value={formOpponent}
                onChange={(e) => setFormOpponent(e.target.value)}
                style={inputStyle}
                placeholder="e.g. University of Peradeniya"
              />
            </Field>

            <Field label="Tournament (Optional)">
              <select
                value={formTournamentId}
                onChange={(e) => setFormTournamentId(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="" style={{ background: colors.deepNavy }}>None / Friendly Match</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id} style={{ background: colors.deepNavy, color: '#fff' }}>
                    {t.name} ({t.season_year})
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Match Date & Time (Sri Lanka Time)">
              <input
                type="datetime-local"
                required
                value={toLocalInput(formMatchAt)}
                onChange={(e) => {
                  const iso = fromLocalInput(e.target.value)
                  if (iso) setFormMatchAt(iso)
                }}
                style={inputStyle}
              />
            </Field>

            <Field label="Venue">
              <input
                type="text"
                value={formVenue}
                onChange={(e) => setFormVenue(e.target.value)}
                style={inputStyle}
                placeholder="e.g. UOR Hockey Grounds, Matara"
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Home / Away / Neutral">
              <select
                value={formHomeAway}
                onChange={(e) => setFormHomeAway(e.target.value as 'Home' | 'Away' | 'Neutral')}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="Home" style={{ background: colors.deepNavy }}>Home</option>
                <option value="Away" style={{ background: colors.deepNavy }}>Away</option>
                <option value="Neutral" style={{ background: colors.deepNavy }}>Neutral</option>
              </select>
            </Field>

            <Field label="Match Status">
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as Fixture['status'])}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {FIXTURE_STATUSES.map((st) => (
                  <option key={st} value={st} style={{ background: colors.deepNavy, color: '#fff' }}>
                    {st}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Conditional score fields (shown only when Completed) */}
          {formStatus === 'Completed' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px',
                padding: '14px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${colors.glassBorder}`,
                borderRadius: '14px',
                marginBottom: '14px',
              }}
            >
              <Field label="Our Score (Ruhuna)">
                <input
                  type="number"
                  required
                  min={0}
                  value={formOurScore}
                  onChange={(e) => setFormOurScore(e.target.value === '' ? '' : Number(e.target.value))}
                  style={inputStyle}
                  placeholder="0"
                />
              </Field>

              <Field label={`Opponent Score (${formOpponent || 'Opponent'})`}>
                <input
                  type="number"
                  required
                  min={0}
                  value={formOpponentScore}
                  onChange={(e) => setFormOpponentScore(e.target.value === '' ? '' : Number(e.target.value))}
                  style={inputStyle}
                  placeholder="0"
                />
              </Field>
            </div>
          )}

          <Field label="Match Notes (Optional)">
            <textarea
              rows={3}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="e.g. Penalty shootout, goal scorers, weather..."
            />
          </Field>

          <FormError message={matchFormError} />

          <FormActions
            onCancel={() => setIsMatchModalOpen(false)}
            saving={savingMatch}
            submitLabel={editingFixture ? 'Update Match' : 'Add Match'}
          />
        </form>
      </Modal>

      {/* QUICK ENTER RESULT MODAL (Admin) */}
      <Modal
        open={!!resultModalFixture}
        title="Enter Match Result"
        onClose={() => setResultModalFixture(null)}
        width={440}
      >
        {resultModalFixture && (
          <form onSubmit={handleSaveQuickResult}>
            <p style={{ color: colors.textSoft, fontSize: '13.5px', marginBottom: '18px' }}>
              Final score for{' '}
              <strong style={{ color: '#fff' }}>
                Ruhuna Hockey vs {resultModalFixture.opponent}
              </strong>:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Ruhuna Score">
                <input
                  type="number"
                  required
                  min={0}
                  value={quickOurScore}
                  onChange={(e) => setQuickOurScore(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{ ...inputStyle, fontSize: '18px', fontWeight: 700, textAlign: 'center' }}
                  placeholder="0"
                />
              </Field>

              <Field label={`${resultModalFixture.opponent} Score`}>
                <input
                  type="number"
                  required
                  min={0}
                  value={quickOpponentScore}
                  onChange={(e) => setQuickOpponentScore(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{ ...inputStyle, fontSize: '18px', fontWeight: 700, textAlign: 'center' }}
                  placeholder="0"
                />
              </Field>
            </div>

            <FormError message={resultFormError} />

            <FormActions
              onCancel={() => setResultModalFixture(null)}
              saving={savingResult}
              submitLabel="Save Result"
            />
          </form>
        )}
      </Modal>

      {/* DELETE CONFIRM DIALOG (Admin) */}
      <ConfirmDialog
        open={!!deletingFixture}
        message={`Are you sure you want to delete the fixture "Ruhuna Hockey vs ${deletingFixture?.opponent}"? This cannot be undone.`}
        busy={deletingBusy}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeletingFixture(null)}
      />
    </SectionShell>
  )
}
