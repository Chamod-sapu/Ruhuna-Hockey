import { useState, useEffect, useMemo, useRef, type FormEvent } from 'react'
import { motion, useInView, animate, useReducedMotion } from 'framer-motion'
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
import { ACHIEVEMENT_CATEGORIES, type Achievement } from '../../lib/types'

// Category Icons
function CategoryIcon({ category }: { category: Achievement['category'] }) {
  switch (category) {
    case 'Championship':
      // Trophy
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
          <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      )
    case 'Runner-up':
      // Silver Medal
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="14" r="6" />
          <path d="M7 2h10l-2 6H9L7 2Z" />
          <path d="m10 14 1.5 2 2.5-3" />
        </svg>
      )
    case 'Podium':
      // 3-Step Podium
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 14h4v7H4z" />
          <path d="M10 9h4v12h-4z" />
          <path d="M16 12h4v9h-4z" />
          <path d="M2 21h20" />
        </svg>
      )
    case 'Individual Award':
      // Star Award
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )
    case 'Milestone':
    default:
      // Flag
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" x2="4" y1="22" y2="15" />
        </svg>
      )
  }
}

// Highlight Counter Tile
function HighlightCounter({ value, label }: { value: number | string; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20px' })
  const [displayNum, setDisplayNum] = useState(0)

  useEffect(() => {
    if (inView && typeof value === 'number') {
      const controls = animate(0, value, {
        duration: 1.2,
        ease: 'easeOut',
        onUpdate: (latest) => setDisplayNum(Math.round(latest)),
      })
      return () => controls.stop()
    }
  }, [inView, value])

  return (
    <div
      ref={ref}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${colors.glassBorder}`,
        borderRadius: '16px',
        padding: '22px 16px',
        textAlign: 'center',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <span
        style={{
          fontFamily: fonts.heading,
          fontWeight: 700,
          fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)',
          color: colors.orange,
          display: 'block',
          lineHeight: 1,
          marginBottom: '6px',
        }}
      >
        {typeof value === 'number' ? displayNum : value}
      </span>
      <span
        style={{
          fontFamily: fonts.body,
          fontSize: '12px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: colors.textSoft,
        }}
      >
        {label}
      </span>
    </div>
  )
}

export default function Achievements() {
  const { user } = useAuth()
  const prefersReduced = useReducedMotion()

  // 1. Achievements Table
  const {
    rows: achievements,
    loading: achievementsLoading,
    error: achievementsError,
    add: addAchievement,
    update: updateAchievement,
    remove: removeAchievement,
  } = useTable<Achievement>('achievements', { orderBy: 'year', ascending: false })

  // 2. Category Filter State
  const [selectedCategory, setSelectedCategory] = useState<'All' | Achievement['category']>('All')

  // Filtered achievements
  const filteredAchievements = useMemo(() => {
    if (selectedCategory === 'All') return achievements
    return achievements.filter((a) => a.category === selectedCategory)
  }, [achievements, selectedCategory])

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: achievements.length }
    for (const cat of ACHIEVEMENT_CATEGORIES) counts[cat] = 0
    for (const a of achievements) {
      if (counts[a.category] !== undefined) counts[a.category]++
    }
    return counts
  }, [achievements])

  // Stat Counters data
  const championshipsCount = useMemo(() => {
    return achievements.filter((a) => a.category === 'Championship').length
  }, [achievements])

  const podiumFinishesCount = useMemo(() => {
    return achievements.filter((a) => a.category === 'Runner-up' || a.category === 'Podium').length
  }, [achievements])

  const latestYear = useMemo(() => {
    if (achievements.length === 0) return '—'
    return Math.max(...achievements.map((a) => a.year))
  }, [achievements])

  // Group achievements by year (sorted descending)
  const achievementsByYear = useMemo(() => {
    const map = new Map<number, Achievement[]>()
    for (const a of filteredAchievements) {
      const list = map.get(a.year) ?? []
      list.push(a)
      map.set(a.year, list)
    }
    // Return sorted years desc
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0])
  }, [filteredAchievements])

  // 3. Modals State
  // (a) Detail View Modal
  const [viewingAchievement, setViewingAchievement] = useState<Achievement | null>(null)

  // (b) Form Modal (Add / Edit)
  const currentYear = new Date().getFullYear()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formYear, setFormYear] = useState<number>(currentYear)
  const [formCategory, setFormCategory] = useState<Achievement['category']>('Championship')
  const [formResultLabel, setFormResultLabel] = useState('')
  const [formTournamentName, setFormTournamentName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formImageUrl, setFormImageUrl] = useState<string | null>(null)
  const [savingAchievement, setSavingAchievement] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // (c) Delete Confirm Dialog
  const [deletingAchievement, setDeletingAchievement] = useState<Achievement | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  // Handlers
  const openAddModal = () => {
    setEditingAchievement(null)
    setFormTitle('')
    setFormYear(currentYear)
    setFormCategory('Championship')
    setFormResultLabel('')
    setFormTournamentName('')
    setFormDescription('')
    setFormImageUrl(null)
    setFormError(null)
    setIsFormOpen(true)
  }

  const openEditModal = (a: Achievement) => {
    setEditingAchievement(a)
    setFormTitle(a.title)
    setFormYear(a.year)
    setFormCategory(a.category)
    setFormResultLabel(a.result_label ?? '')
    setFormTournamentName(a.tournament_name ?? '')
    setFormDescription(a.description ?? '')
    setFormImageUrl(a.image_url)
    setFormError(null)
    setIsFormOpen(true)
  }

  const handleSaveAchievement = async (e: FormEvent) => {
    e.preventDefault()
    setSavingAchievement(true)
    setFormError(null)

    const payload = {
      title: formTitle.trim(),
      year: Number(formYear),
      category: formCategory,
      result_label: formResultLabel.trim() || null,
      tournament_name: formTournamentName.trim() || null,
      description: formDescription.trim() || null,
      image_url: formImageUrl,
    }

    let err: string | null = null
    if (editingAchievement) {
      err = await updateAchievement(editingAchievement.id, payload)
    } else {
      err = await addAchievement(payload)
    }

    if (err) {
      setFormError(err)
      setSavingAchievement(false)
    } else {
      setSavingAchievement(false)
      setIsFormOpen(false)
      setEditingAchievement(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingAchievement) return
    setDeletingBusy(true)
    const err = await removeAchievement(deletingAchievement.id)
    if (!err && deletingAchievement.image_url) {
      await deleteImageByUrl(deletingAchievement.image_url)
    }
    setDeletingBusy(false)
    setDeletingAchievement(null)
  }

  return (
    <SectionShell
      id="achievements"
      alt
      eyebrow="Hall of Fame"
      title="Our Achievements"
      addLabel="Add achievement"
      onAdd={user ? openAddModal : undefined}
    >
      {/* Styles for Shimmering Championship Border & Responsive Timeline */}
      <style>{`
        @keyframes champGlow {
          0%, 100% {
            border-color: rgba(247, 148, 29, 0.45);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 16px rgba(247, 148, 29, 0.25);
          }
          50% {
            border-color: rgba(247, 148, 29, 0.95);
            box-shadow: 0 12px 35px rgba(0, 0, 0, 0.5), 0 0 28px rgba(247, 148, 29, 0.55);
          }
        }

        .timeline-wrapper {
          position: relative;
          max-width: 1060px;
          margin: 0 auto;
          padding: 20px 0;
        }

        .timeline-spine {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 20px;
          width: 2px;
          background: linear-gradient(180deg, #f7941d 0%, rgba(247, 148, 29, 0.45) 85%, transparent 100%);
        }

        @media (min-width: 768px) {
          .timeline-spine {
            left: 50%;
            transform: translateX(-50%);
          }
        }

        .timeline-node {
          position: relative;
          margin-bottom: 36px;
          padding-left: 48px;
        }

        @media (min-width: 768px) {
          .timeline-node {
            padding-left: 0;
            width: 50%;
          }
          .timeline-node.left {
            left: 0;
            padding-right: 36px;
          }
          .timeline-node.right {
            left: 50%;
            padding-left: 36px;
          }
        }

        .timeline-pin {
          position: absolute;
          top: 24px;
          left: 11px;
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: #1c1f4a;
          border: 3px solid #f7941d;
          box-shadow: 0 0 12px #f7941d;
          z-index: 5;
        }

        @media (min-width: 768px) {
          .timeline-node.left .timeline-pin {
            left: auto;
            right: -10px;
          }
          .timeline-node.right .timeline-pin {
            left: -10px;
          }
        }
      `}</style>

      {/* 1. HIGHLIGHT COUNTERS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '44px',
        }}
      >
        <HighlightCounter value={achievements.length} label="Total Achievements" />
        <HighlightCounter value={championshipsCount} label="Championships" />
        <HighlightCounter value={podiumFinishesCount} label="Podium Finishes" />
        <HighlightCounter value={latestYear} label={`Latest: ${latestYear}`} />
      </div>

      {/* 2. CATEGORY FILTER CHIPS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '48px',
        }}
      >
        {(['All', ...ACHIEVEMENT_CATEGORIES] as const).map((cat) => {
          const isSelected = selectedCategory === cat
          const count = categoryCounts[cat] ?? 0
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '7px 16px',
                borderRadius: '999px',
                background: isSelected ? colors.orange : 'rgba(255,255,255,0.06)',
                color: isSelected ? colors.deepNavy : colors.grey,
                fontWeight: isSelected ? 700 : 500,
                border: isSelected ? 'none' : `1px solid ${colors.glassBorder}`,
                fontSize: '12.5px',
                fontFamily: fonts.body,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {cat} ({count})
            </button>
          )
        })}
      </div>

      {/* 3. VERTICAL TIMELINE GROUPED BY YEAR */}
      {achievementsError ? (
        <EmptyState message={`Failed to load achievements: ${achievementsError}`} />
      ) : achievementsLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '700px', margin: '0 auto' }}>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.35, 0.7, 0.35] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{
                height: '180px',
                borderRadius: '20px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${colors.glassBorder}`,
              }}
            />
          ))}
        </div>
      ) : achievementsByYear.length === 0 ? (
        <EmptyState message="Our trophy cabinet is waiting to be filled." />
      ) : (
        <div className="timeline-wrapper">
          {/* Vertical spine */}
          <div className="timeline-spine" />

          {achievementsByYear.map(([year, items]) => {
            return (
              <div key={year} style={{ marginBottom: '56px' }}>
                {/* Outlined Year Label Header */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '32px',
                    position: 'relative',
                    zIndex: 6,
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.heading,
                      fontWeight: 800,
                      fontSize: 'clamp(3.5rem, 7vw, 5.5rem)',
                      lineHeight: 1,
                      color: 'transparent',
                      WebkitTextStroke: '1px rgba(255,255,255,0.18)',
                      userSelect: 'none',
                    }}
                  >
                    {year}
                  </span>
                  <div
                    style={{
                      marginTop: '-18px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '5px 18px',
                      borderRadius: '999px',
                      background: 'rgba(28,31,74,0.95)',
                      border: `1px solid ${colors.orange}`,
                      boxShadow: '0 4px 18px rgba(0,0,0,0.4)',
                    }}
                  >
                    <span style={{ width: '7px', height: '7px', borderRadius: '999px', background: colors.orange }} />
                    <span style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: '14px', color: '#fff' }}>
                      Season {year}
                    </span>
                  </div>
                </div>

                {/* Items in this year (alternating left/right on desktop) */}
                {items.map((achievement, idx) => {
                  const isLeft = idx % 2 === 0
                  const isChampionship = achievement.category === 'Championship'

                  return (
                    <div
                      key={achievement.id}
                      className={`timeline-node ${isLeft ? 'left' : 'right'}`}
                    >
                      {/* Timeline Dot */}
                      <div className="timeline-pin" />

                      {/* Achievement Card */}
                      <motion.div
                        initial={{ opacity: 0, x: isLeft ? -28 : 28 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        whileHover={{ y: -4 }}
                        onClick={() => setViewingAchievement(achievement)}
                        style={{
                          position: 'relative',
                          background: 'rgba(255,255,255,0.04)',
                          border: isChampionship ? `1px solid ${colors.orange}` : `1px solid ${colors.glassBorder}`,
                          borderRadius: '20px',
                          padding: '22px',
                          backdropFilter: 'blur(10px)',
                          WebkitBackdropFilter: 'blur(10px)',
                          cursor: 'pointer',
                          boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
                          animation: isChampionship && !prefersReduced ? 'champGlow 3s infinite ease-in-out' : 'none',
                        }}
                      >
                        {/* Admin Row Actions */}
                        {user && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '20px',
                              right: '20px',
                              zIndex: 10,
                            }}
                          >
                            <RowActions
                              onEdit={() => openEditModal(achievement)}
                              onDelete={() => setDeletingAchievement(achievement)}
                            />
                          </div>
                        )}

                        {/* Top bar: Category Icon + Result Label + Category */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '999px',
                              background: 'rgba(247,148,29,0.14)',
                              border: '1px solid rgba(247,148,29,0.35)',
                              color: colors.orange,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <CategoryIcon category={achievement.category} />
                          </div>

                          {achievement.result_label && (
                            <span
                              style={{
                                padding: '3px 10px',
                                borderRadius: '999px',
                                background: colors.orange,
                                color: colors.deepNavy,
                                fontSize: '11px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                fontFamily: fonts.body,
                              }}
                            >
                              {achievement.result_label}
                            </span>
                          )}

                          <span
                            style={{
                              fontSize: '11.5px',
                              color: colors.textSoft,
                              fontFamily: fonts.body,
                            }}
                          >
                            {achievement.category}
                          </span>
                        </div>

                        {/* Title */}
                        <h4
                          style={{
                            fontFamily: fonts.heading,
                            fontWeight: 600,
                            fontSize: '18px',
                            color: '#ffffff',
                            margin: '0 0 6px',
                            lineHeight: 1.3,
                          }}
                        >
                          {achievement.title}
                        </h4>

                        {/* Tournament Name */}
                        {achievement.tournament_name && (
                          <p
                            style={{
                              fontFamily: fonts.body,
                              fontSize: '12.5px',
                              color: colors.textSoft,
                              margin: '0 0 10px',
                            }}
                          >
                            🏆 {achievement.tournament_name}
                          </p>
                        )}

                        {/* Description (3-line clamp) */}
                        {achievement.description && (
                          <p
                            style={{
                              fontFamily: fonts.body,
                              fontSize: '13px',
                              lineHeight: 1.55,
                              color: colors.grey,
                              margin: '0 0 12px',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {achievement.description}
                          </p>
                        )}

                        {/* Optional 16:9 Image */}
                        {achievement.image_url && (
                          <div
                            style={{
                              width: '100%',
                              aspectRatio: '16 / 9',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              marginTop: '8px',
                              border: `1px solid ${colors.glassBorder}`,
                              background: colors.deepNavy,
                            }}
                          >
                            <img
                              src={achievement.image_url}
                              alt={achievement.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        )}
                      </motion.div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* DETAIL MODAL (Click on achievement) */}
      <Modal
        open={!!viewingAchievement}
        title={viewingAchievement?.title ?? 'Achievement Details'}
        onClose={() => setViewingAchievement(null)}
        width={540}
      >
        {viewingAchievement && (
          <div>
            {/* Header info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '999px',
                  background: 'rgba(247,148,29,0.15)',
                  border: '1px solid rgba(247,148,29,0.4)',
                  color: colors.orange,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CategoryIcon category={viewingAchievement.category} />
              </div>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '999px',
                  background: colors.orange,
                  color: colors.deepNavy,
                  fontSize: '12px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                }}
              >
                {viewingAchievement.result_label || viewingAchievement.category}
              </span>
              <span style={{ fontSize: '13px', color: colors.textSoft }}>
                Year {viewingAchievement.year}
              </span>
            </div>

            <h3 style={{ fontFamily: fonts.heading, fontSize: '22px', fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>
              {viewingAchievement.title}
            </h3>

            {viewingAchievement.tournament_name && (
              <p style={{ fontFamily: fonts.body, fontSize: '13.5px', color: colors.orange, margin: '0 0 16px' }}>
                🏆 {viewingAchievement.tournament_name}
              </p>
            )}

            {/* Large Image (if present) */}
            {viewingAchievement.image_url && (
              <div
                style={{
                  width: '100%',
                  aspectRatio: '16 / 9',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  marginBottom: '18px',
                  border: `1px solid ${colors.glassBorder}`,
                }}
              >
                <img
                  src={viewingAchievement.image_url}
                  alt={viewingAchievement.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}

            {viewingAchievement.description && (
              <div style={{ paddingTop: '14px', borderTop: `1px solid ${colors.glassBorder}` }}>
                <p style={{ fontFamily: fonts.body, fontSize: '14px', lineHeight: 1.7, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
                  {viewingAchievement.description}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ADD / EDIT MODAL (Admin) */}
      <Modal
        open={isFormOpen}
        title={editingAchievement ? 'Edit Achievement' : 'Add Achievement'}
        onClose={() => setIsFormOpen(false)}
        width={560}
      >
        <form onSubmit={handleSaveAchievement}>
          <Field label="Achievement Title">
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              style={inputStyle}
              placeholder="e.g. SLUG Hockey Championship Gold"
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Year">
              <input
                type="number"
                required
                min={1990}
                max={currentYear + 1}
                value={formYear}
                onChange={(e) => setFormYear(Number(e.target.value))}
                style={inputStyle}
              />
            </Field>

            <Field label="Category">
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as Achievement['category'])}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {ACHIEVEMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} style={{ background: colors.deepNavy, color: '#fff' }}>
                    {cat}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Result Label" hint="e.g. Champions, Gold, MVP">
              <input
                type="text"
                value={formResultLabel}
                onChange={(e) => setFormResultLabel(e.target.value)}
                style={inputStyle}
                placeholder="Champions"
              />
            </Field>

            <Field label="Tournament / Competition">
              <input
                type="text"
                value={formTournamentName}
                onChange={(e) => setFormTournamentName(e.target.value)}
                style={inputStyle}
                placeholder="Sri Lanka University Games"
              />
            </Field>
          </div>

          <Field label="Description (Optional)">
            <textarea
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Notable details about the finals, decisive goals, scores..."
            />
          </Field>

          <ImageUpload
            label="Celebration / Trophy Photo"
            value={formImageUrl}
            onChange={setFormImageUrl}
            folder="achievements"
            shape="wide"
          />

          <FormError message={formError} />

          <FormActions
            onCancel={() => setIsFormOpen(false)}
            saving={savingAchievement}
            submitLabel={editingAchievement ? 'Update Achievement' : 'Save Achievement'}
          />
        </form>
      </Modal>

      {/* CONFIRM DELETE DIALOG (Admin) */}
      <ConfirmDialog
        open={!!deletingAchievement}
        message={`Are you sure you want to remove "${deletingAchievement?.title}" (${deletingAchievement?.year})? This action cannot be undone.`}
        busy={deletingBusy}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeletingAchievement(null)}
      />
    </SectionShell>
  )
}
