import { useState, useEffect, useCallback, useMemo, useRef, type FormEvent } from 'react'
import { motion, AnimatePresence, useInView, animate } from 'framer-motion'
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
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { LEADERSHIP_ROLES, type Leader, type LeadershipRole } from '../../lib/types'

const DEFAULT_HEADLINE = 'Who We Are'
const DEFAULT_INTRO =
  'Founded with a spirit of resilience and relentless teamwork, Ruhuna Hockey represents the University of Ruhuna across national and inter-university championships. We cultivate talent, discipline, and sportsmanship on and off the pitch.'
const DEFAULT_MISSION =
  'To develop disciplined, high-performing student athletes who uphold the pride of Ruhuna through teamwork, dedication, and competitive excellence.'

const FIXED_ROLES: LeadershipRole[] = ['Captain', 'Vice Captain', 'Team Manager', 'Coach']

function getInitials(name: string): string {
  if (!name) return 'RH'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function StatCounter({ target, label }: { target: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (inView) {
      const controls = animate(0, target, {
        duration: 1.2,
        ease: 'easeOut',
        onUpdate: (latest) => setDisplayValue(Math.round(latest)),
      })
      return () => controls.stop()
    }
  }, [inView, target])

  return (
    <div
      ref={ref}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${colors.glassBorder}`,
        borderRadius: '16px',
        padding: '24px 16px',
        textAlign: 'center',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
      }}
    >
      <span
        style={{
          fontFamily: fonts.heading,
          fontWeight: 700,
          fontSize: 'clamp(2rem, 3.2vw, 2.75rem)',
          color: colors.orange,
          lineHeight: 1,
        }}
      >
        {displayValue}
      </span>
      <span
        style={{
          fontFamily: fonts.body,
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: colors.textSoft,
        }}
      >
        {label}
      </span>
    </div>
  )
}

export default function About() {
  const { user } = useAuth()

  // Site Settings state
  const [headline, setHeadline] = useState(DEFAULT_HEADLINE)
  const [intro, setIntro] = useState(DEFAULT_INTRO)
  const [mission, setMission] = useState(DEFAULT_MISSION)
  const [settingsLoading, setSettingsLoading] = useState(true)

  // Edit Intro Modal state
  const [isIntroModalOpen, setIsIntroModalOpen] = useState(false)
  const [introHeadlineInput, setIntroHeadlineInput] = useState('')
  const [introTextInput, setIntroTextInput] = useState('')
  const [introMissionInput, setIntroMissionInput] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsErr, setSettingsErr] = useState<string | null>(null)

  // Live counts for stats
  const [tableCounts, setTableCounts] = useState({ players: 0, achievements: 0, tournaments: 0 })

  // Leadership data via useTable
  const {
    rows: leaders,
    loading: leadersLoading,
    error: leadersError,
    add: addLeader,
    update: updateLeader,
    remove: removeLeader,
  } = useTable<Leader>('leadership', { orderBy: 'season_year', ascending: false })

  // Distinct season years
  const currentYear = new Date().getFullYear()
  const years = useMemo(() => {
    const set = new Set<number>(leaders.map((l) => l.season_year))
    if (set.size === 0) set.add(currentYear)
    return Array.from(set).sort((a, b) => b - a)
  }, [leaders, currentYear])

  const [selectedYear, setSelectedYear] = useState<number>(() => years[0] ?? currentYear)

  useEffect(() => {
    if (years.length > 0 && !years.includes(selectedYear)) {
      setSelectedYear(years[0])
    }
  }, [years, selectedYear])

  // Distinct seasons count
  const seasonsCount = useMemo(() => {
    return new Set(leaders.map((l) => l.season_year)).size
  }, [leaders])

  // Fetch Site Settings directly from Supabase
  const loadSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['about_headline', 'about_intro', 'about_mission'])

      if (!error && data && data.length > 0) {
        const map = Object.fromEntries(data.map((r: { key: string; value: string }) => [r.key, r.value]))
        if (map.about_headline) setHeadline(map.about_headline)
        if (map.about_intro) setIntro(map.about_intro)
        if (map.about_mission) setMission(map.about_mission)
      }
    } catch {
      // Fallback to defaults
    } finally {
      setSettingsLoading(false)
    }
  }, [])

  // Fetch live stats counts
  const loadCounts = useCallback(async () => {
    try {
      const [pRes, aRes, tRes] = await Promise.all([
        supabase.from('players').select('id', { count: 'exact', head: true }),
        supabase.from('achievements').select('id', { count: 'exact', head: true }),
        supabase.from('tournaments').select('id', { count: 'exact', head: true }),
      ])
      setTableCounts({
        players: pRes.count ?? 0,
        achievements: aRes.count ?? 0,
        tournaments: tRes.count ?? 0,
      })
    } catch {
      // Fallback
    }
  }, [])

  useEffect(() => {
    void loadSettings()
    void loadCounts()
  }, [loadSettings, loadCounts])

  // Handle saving site settings
  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    setSettingsErr(null)
    const now = new Date().toISOString()
    const payload = [
      { key: 'about_headline', value: introHeadlineInput.trim() || DEFAULT_HEADLINE, updated_at: now },
      { key: 'about_intro', value: introTextInput.trim() || DEFAULT_INTRO, updated_at: now },
      { key: 'about_mission', value: introMissionInput.trim() || DEFAULT_MISSION, updated_at: now },
    ]

    const { error } = await supabase.from('site_settings').upsert(payload)
    if (error) {
      setSettingsErr(error.message)
      setSavingSettings(false)
    } else {
      setHeadline(introHeadlineInput.trim() || DEFAULT_HEADLINE)
      setIntro(introTextInput.trim() || DEFAULT_INTRO)
      setMission(introMissionInput.trim() || DEFAULT_MISSION)
      setSavingSettings(false)
      setIsIntroModalOpen(false)
    }
  }

  // Leader Form Modal state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingLeader, setEditingLeader] = useState<Leader | null>(null)
  const [formYear, setFormYear] = useState<number>(currentYear)
  const [formRole, setFormRole] = useState<LeadershipRole>('Captain')
  const [formName, setFormName] = useState('')
  const [formPhoto, setFormPhoto] = useState<string | null>(null)
  const [formBio, setFormBio] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [savingLeader, setSavingLeader] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Confirm delete dialog state
  const [deletingLeader, setDeletingLeader] = useState<Leader | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  // Card details modal state
  const [viewingLeader, setViewingLeader] = useState<Leader | null>(null)

  const openAddForm = (initialRole: LeadershipRole = 'Captain', initialYear?: number) => {
    setEditingLeader(null)
    setFormYear(initialYear ?? selectedYear ?? currentYear)
    setFormRole(initialRole)
    setFormName('')
    setFormPhoto(null)
    setFormBio('')
    setFormEmail('')
    setFormPhone('')
    setFormError(null)
    setIsFormOpen(true)
  }

  const openEditForm = (leader: Leader) => {
    setEditingLeader(leader)
    setFormYear(leader.season_year)
    setFormRole(leader.role)
    setFormName(leader.full_name)
    setFormPhoto(leader.photo_url)
    setFormBio(leader.bio ?? '')
    setFormEmail(leader.email ?? '')
    setFormPhone(leader.phone ?? '')
    setFormError(null)
    setIsFormOpen(true)
  }

  const handleSubmitLeader = async (e: FormEvent) => {
    e.preventDefault()
    setSavingLeader(true)
    setFormError(null)

    const payload = {
      season_year: Number(formYear),
      role: formRole,
      full_name: formName.trim(),
      photo_url: formPhoto,
      bio: formBio.trim() || null,
      email: formEmail.trim() || null,
      phone: formPhone.trim() || null,
    }

    let err: string | null = null
    if (editingLeader) {
      err = await updateLeader(editingLeader.id, payload)
    } else {
      err = await addLeader(payload)
    }

    if (err) {
      if (err.includes('23505') || err.toLowerCase().includes('duplicate key') || err.toLowerCase().includes('unique')) {
        setFormError('That role already has a person for this year — edit the existing entry instead.')
      } else {
        setFormError(err)
      }
      setSavingLeader(false)
    } else {
      setSavingLeader(false)
      setIsFormOpen(false)
      setEditingLeader(null)
      // Ensure the selected year matches the newly added year
      setSelectedYear(Number(formYear))
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingLeader) return
    setDeletingBusy(true)
    const err = await removeLeader(deletingLeader.id)
    if (!err && deletingLeader.photo_url) {
      await deleteImageByUrl(deletingLeader.photo_url)
    }
    setDeletingBusy(false)
    setDeletingLeader(null)
  }

  return (
    <SectionShell
      id="about"
      eyebrow="About Us"
      title={settingsLoading ? 'Who We Are' : headline}
      addLabel="Add leader"
      onAdd={user ? () => openAddForm() : undefined}
    >
      {/* 1. INTRO BLOCK: Two Columns */}
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '40px',
          alignItems: 'center',
          marginBottom: '80px',
        }}
      >
        {/* Left Column: Intro text & Mission Card */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <span
              style={{
                fontFamily: fonts.body,
                fontSize: '12.5px',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: colors.orange,
              }}
            >
              Our Heritage & Spirit
            </span>

            {/* Admin Edit Intro Trigger */}
            {user && (
              <button
                type="button"
                onClick={() => {
                  setIntroHeadlineInput(headline)
                  setIntroTextInput(intro)
                  setIntroMissionInput(mission)
                  setSettingsErr(null)
                  setIsIntroModalOpen(true)
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.08)',
                  border: `1px solid ${colors.glassBorder}`,
                  color: colors.orange,
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: fonts.body,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                Edit intro
              </button>
            )}
          </div>

          <p
            style={{
              fontFamily: fonts.body,
              fontSize: '16px',
              lineHeight: 1.7,
              color: colors.grey,
              marginBottom: '26px',
            }}
          >
            {intro}
          </p>

          {/* "Our Mission" Glass Card with orange left border */}
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${colors.glassBorder}`,
              borderLeft: `4px solid ${colors.orange}`,
              borderRadius: '16px',
              padding: '22px 24px',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
            }}
          >
            <h4
              style={{
                fontFamily: fonts.heading,
                fontSize: '15px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#ffffff',
                marginBottom: '8px',
              }}
            >
              Our Mission
            </h4>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: '14.5px',
                lineHeight: 1.65,
                color: colors.textSoft,
                margin: 0,
              }}
            >
              {mission}
            </p>
          </div>
        </div>

        {/* Right Column: 2x2 Grid of Live Stat Tiles */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
          }}
        >
          <StatCounter target={seasonsCount} label="Seasons" />
          <StatCounter target={tableCounts.players} label="Players" />
          <StatCounter target={tableCounts.achievements} label="Achievements" />
          <StatCounter target={tableCounts.tournaments} label="Tournaments" />
        </div>
      </motion.div>

      {/* 2. LEADERSHIP BY YEAR BLOCK */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '22px' }}>
          <div>
            <span
              style={{
                fontFamily: fonts.body,
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: colors.orange,
              }}
            >
              Leadership Hierarchy
            </span>
            <h3
              style={{
                fontFamily: fonts.heading,
                fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                fontWeight: 600,
                color: '#ffffff',
                marginTop: '4px',
                marginBottom: 0,
              }}
            >
              Leadership by Year
            </h3>
          </div>

          {/* Horizontally scrollable row of year pills */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflowX: 'auto',
              maxWidth: '100%',
              paddingBottom: '6px',
              scrollbarWidth: 'none',
            }}
          >
            {years.map((yr) => {
              const isSelected = yr === selectedYear
              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  style={{
                    padding: '7px 18px',
                    borderRadius: '999px',
                    background: isSelected ? colors.orange : 'rgba(255,255,255,0.06)',
                    color: isSelected ? colors.deepNavy : '#ffffff',
                    fontWeight: isSelected ? 700 : 500,
                    border: isSelected ? 'none' : `1px solid ${colors.glassBorder}`,
                    fontSize: '13px',
                    fontFamily: fonts.body,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 4px 18px rgba(247,148,29,0.3)' : 'none',
                  }}
                >
                  {yr}
                </button>
              )
            })}
          </div>
        </div>

        {/* Leaders Grid (Fixed 4: Captain, Vice Captain, Team Manager, Coach) */}
        {leadersError ? (
          <EmptyState message={`Failed to load leadership data: ${leadersError}`} />
        ) : leadersLoading ? (
          /* Loading Skeletons */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '22px' }}>
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.35, 0.7, 0.35] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                style={{
                  height: '370px',
                  borderRadius: '18px',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${colors.glassBorder}`,
                }}
              />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedYear}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '22px',
              }}
            >
              {FIXED_ROLES.map((role) => {
                const leader = leaders.find((l) => l.season_year === selectedYear && l.role === role)
                const isCaptain = role === 'Captain' || role === 'Vice Captain'

                if (!leader) {
                  return (
                    <div
                      key={role}
                      style={{
                        border: '1px dashed rgba(255,255,255,0.18)',
                        borderRadius: '18px',
                        background: 'rgba(255,255,255,0.02)',
                        padding: '28px 20px',
                        minHeight: '360px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        gap: '12px',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          background: 'rgba(255,255,255,0.06)',
                          color: colors.textSoft,
                          border: `1px solid ${colors.glassBorder}`,
                          fontFamily: fonts.body,
                        }}
                      >
                        {role}
                      </span>
                      <p
                        style={{
                          fontFamily: fonts.body,
                          fontSize: '13.5px',
                          color: colors.textSoft,
                          margin: 0,
                        }}
                      >
                        Not yet assigned
                      </p>
                      {user && (
                        <button
                          type="button"
                          onClick={() => openAddForm(role, selectedYear)}
                          style={{
                            marginTop: '8px',
                            padding: '7px 16px',
                            borderRadius: '999px',
                            background: 'rgba(247,148,29,0.15)',
                            border: `1px solid ${colors.orange}`,
                            color: colors.orange,
                            fontSize: '12px',
                            fontWeight: 700,
                            fontFamily: fonts.body,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          + Assign {role}
                        </button>
                      )}
                    </div>
                  )
                }

                return (
                  <motion.div
                    key={leader.id}
                    whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
                    transition={{ duration: 0.25 }}
                    onClick={() => setViewingLeader(leader)}
                    style={{
                      position: 'relative',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${colors.glassBorder}`,
                      borderRadius: '18px',
                      padding: '16px',
                      cursor: 'pointer',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Admin Row Actions */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '22px',
                        right: '22px',
                        zIndex: 10,
                      }}
                    >
                      <RowActions
                        onEdit={() => openEditForm(leader)}
                        onDelete={() => setDeletingLeader(leader)}
                      />
                    </div>

                    {/* Portrait Photo (4:5) */}
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '4 / 5',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        marginBottom: '14px',
                        background: `linear-gradient(135deg, ${colors.deepNavy}, ${colors.navy})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                      }}
                    >
                      {leader.photo_url ? (
                        <img
                          src={leader.photo_url}
                          alt={leader.full_name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            fontFamily: fonts.heading,
                            fontSize: '34px',
                            fontWeight: 700,
                            color: colors.orange,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {getInitials(leader.full_name)}
                        </span>
                      )}
                    </div>

                    {/* Role badge */}
                    <div style={{ marginBottom: '8px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: isCaptain ? 700 : 600,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          background: isCaptain ? colors.orange : 'rgba(47,52,112,0.45)',
                          color: isCaptain ? colors.deepNavy : '#ffffff',
                          border: isCaptain ? 'none' : '1px solid rgba(247,148,29,0.4)',
                          fontFamily: fonts.body,
                        }}
                      >
                        {leader.role}
                      </span>
                    </div>

                    {/* Full Name */}
                    <h4
                      style={{
                        fontFamily: fonts.heading,
                        fontWeight: 600,
                        fontSize: '18px',
                        color: '#ffffff',
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      {leader.full_name}
                    </h4>

                    {/* Clamped Bio */}
                    <p
                      style={{
                        fontFamily: fonts.body,
                        fontSize: '13px',
                        color: colors.textSoft,
                        lineHeight: 1.5,
                        marginTop: '8px',
                        marginBottom: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {leader.bio || 'Click to view contact information and full bio.'}
                    </p>
                  </motion.div>
                )
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>

      {/* DETAIL MODAL (Click on card) */}
      <Modal
        open={!!viewingLeader}
        title={viewingLeader?.full_name ?? 'Leader Profile'}
        onClose={() => setViewingLeader(null)}
        width={480}
      >
        {viewingLeader && (
          <div>
            <div style={{ display: 'flex', gap: '18px', alignItems: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '84px',
                  height: '105px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: `linear-gradient(135deg, ${colors.deepNavy}, ${colors.navy})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: `1px solid ${colors.glassBorder}`,
                }}
              >
                {viewingLeader.photo_url ? (
                  <img
                    src={viewingLeader.photo_url}
                    alt={viewingLeader.full_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontFamily: fonts.heading, fontSize: '24px', fontWeight: 700, color: colors.orange }}>
                    {getInitials(viewingLeader.full_name)}
                  </span>
                )}
              </div>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    background: ['Captain', 'Vice Captain'].includes(viewingLeader.role) ? colors.orange : 'rgba(47,52,112,0.5)',
                    color: ['Captain', 'Vice Captain'].includes(viewingLeader.role) ? colors.deepNavy : '#ffffff',
                    border: ['Captain', 'Vice Captain'].includes(viewingLeader.role) ? 'none' : '1px solid rgba(247,148,29,0.4)',
                    marginBottom: '8px',
                    fontFamily: fonts.body,
                  }}
                >
                  {viewingLeader.role} · {viewingLeader.season_year}
                </span>
                <h4 style={{ fontFamily: fonts.heading, fontSize: '20px', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                  {viewingLeader.full_name}
                </h4>
              </div>
            </div>

            {viewingLeader.bio && (
              <div style={{ marginBottom: '18px' }}>
                <h5
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: colors.orange,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '6px',
                  }}
                >
                  Biography
                </h5>
                <p style={{ fontFamily: fonts.body, fontSize: '14px', lineHeight: 1.65, color: 'rgba(255,255,255,0.88)', margin: 0 }}>
                  {viewingLeader.bio}
                </p>
              </div>
            )}

            {(viewingLeader.email || viewingLeader.phone) && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  paddingTop: '16px',
                  borderTop: `1px solid ${colors.glassBorder}`,
                }}
              >
                {viewingLeader.email && (
                  <a
                    href={`mailto:${viewingLeader.email}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '9px',
                      color: colors.grey,
                      fontSize: '13.5px',
                      textDecoration: 'none',
                      fontFamily: fonts.body,
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={colors.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    {viewingLeader.email}
                  </a>
                )}
                {viewingLeader.phone && (
                  <a
                    href={`tel:${viewingLeader.phone}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '9px',
                      color: colors.grey,
                      fontSize: '13.5px',
                      textDecoration: 'none',
                      fontFamily: fonts.body,
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={colors.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {viewingLeader.phone}
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* EDIT INTRO MODAL (Admin) */}
      <Modal
        open={isIntroModalOpen}
        title="Edit About Section Intro"
        onClose={() => setIsIntroModalOpen(false)}
        width={560}
      >
        <form onSubmit={handleSaveSettings}>
          <Field label="Headline" hint="Main title of the About section">
            <input
              type="text"
              required
              value={introHeadlineInput}
              onChange={(e) => setIntroHeadlineInput(e.target.value)}
              style={inputStyle}
              placeholder="Who We Are"
            />
          </Field>

          <Field label="Intro Paragraph" hint="Overview of the club, history and pride">
            <textarea
              required
              rows={4}
              value={introTextInput}
              onChange={(e) => setIntroTextInput(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Describe the club's story..."
            />
          </Field>

          <Field label="Our Mission" hint="Short mission statement displayed in the glass card">
            <textarea
              required
              rows={3}
              value={introMissionInput}
              onChange={(e) => setIntroMissionInput(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Enter team mission statement..."
            />
          </Field>

          <FormError message={settingsErr} />

          <FormActions
            onCancel={() => setIsIntroModalOpen(false)}
            saving={savingSettings}
            submitLabel="Save Changes"
          />
        </form>
      </Modal>

      {/* ADD / EDIT LEADER MODAL (Admin) */}
      <Modal
        open={isFormOpen}
        title={editingLeader ? 'Edit Leader' : 'Add Leader'}
        onClose={() => setIsFormOpen(false)}
        width={560}
      >
        <form onSubmit={handleSubmitLeader}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Season Year">
              <input
                type="number"
                required
                min={1990}
                max={2100}
                value={formYear}
                onChange={(e) => setFormYear(Number(e.target.value))}
                style={inputStyle}
              />
            </Field>

            <Field label="Role">
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as LeadershipRole)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {LEADERSHIP_ROLES.map((r) => (
                  <option key={r} value={r} style={{ background: colors.deepNavy, color: '#fff' }}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Full Name">
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              style={inputStyle}
              placeholder="e.g. Kasun Madushanka"
            />
          </Field>

          <ImageUpload
            label="Portrait Photo"
            value={formPhoto}
            onChange={setFormPhoto}
            folder="leadership"
            shape="square"
          />

          <Field label="Biography" hint="Short bio (first 3 lines will be displayed on card)">
            <textarea
              rows={3}
              value={formBio}
              onChange={(e) => setFormBio(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Leadership experience, awards, achievements..."
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Email (Optional)">
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                style={inputStyle}
                placeholder="leader@ruhuna.ac.lk"
              />
            </Field>

            <Field label="Phone (Optional)">
              <input
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                style={inputStyle}
                placeholder="+94 7X XXX XXXX"
              />
            </Field>
          </div>

          <FormError message={formError} />

          <FormActions
            onCancel={() => setIsFormOpen(false)}
            saving={savingLeader}
            submitLabel={editingLeader ? 'Update Leader' : 'Add Leader'}
          />
        </form>
      </Modal>

      {/* CONFIRM DELETE DIALOG (Admin) */}
      <ConfirmDialog
        open={!!deletingLeader}
        message={`Are you sure you want to remove ${deletingLeader?.full_name} (${deletingLeader?.role}) from ${deletingLeader?.season_year} leadership? This action cannot be undone.`}
        busy={deletingBusy}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeletingLeader(null)}
      />
    </SectionShell>
  )
}
