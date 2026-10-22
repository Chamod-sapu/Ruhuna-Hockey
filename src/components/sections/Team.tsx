import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useReducedMotion } from 'framer-motion'
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
import { fmtDate } from '../../lib/format'
import { POSITIONS, SQUAD_TEAMS, type Position, type SquadTeam, type Tournament, type Player, type SquadMember } from '../../lib/types'

function getSquadMemberTeam(m: SquadMember): SquadTeam {
  const raw = m.team_type || m.players?.team_type
  if (raw === "Women's Team" || raw === "Women's" || raw === 'women') return "Women's Team"
  if (raw === "Men's Team" || raw === "Men's" || raw === 'men') return "Men's Team"
  const bio = m.players?.bio
  if (bio && /\[Team:\s*Women's(?:\s*Team)?\]/i.test(bio)) return "Women's Team"
  if (bio && /\[Team:\s*Men's(?:\s*Team)?\]/i.test(bio)) return "Men's Team"
  return "Men's Team"
}

function cleanPlayerBio(bio: string | null | undefined): string | null {
  if (!bio) return null
  const cleaned = bio.replace(/\[Team:\s*(Men's|Women's)(?:\s*Team)?\]\s*/gi, '').trim()
  return cleaned || null
}

function getInitials(name: string): string {
  if (!name) return 'RH'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// 3D Tilt Collectible Trading Card
function TradingCard({
  member,
  onOpenDetails,
  onEdit,
  onDelete,
  index = 0,
}: {
  member: SquadMember
  onOpenDetails: () => void
  onEdit?: () => void
  onDelete?: () => void
  index?: number
}) {
  const prefersReduced = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // Max ±8 degrees tilt
  const rotateX = useTransform(y, [-120, 120], [8, -8])
  const rotateY = useTransform(x, [-120, 120], [-8, 8])

  // Moving light sheen opacity & position
  const sheenOpacity = useTransform(x, (val) => (Math.abs(val) > 4 ? 0.15 : 0))

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReduced) return
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set(e.clientX - centerX)
    y.set(e.clientY - centerY)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  const player = member.players
  const isCaptain = member.is_captain
  const isViceCaptain = member.is_vice_captain
  const team = getSquadMemberTeam(member)
  const isWomen = team === "Women's Team"

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.4), ease: 'easeOut' }}
      style={{ perspective: 900 }}
    >
      <motion.div
        tabIndex={0}
        role="button"
        aria-label={`${player?.full_name ?? 'Player'} details card`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpenDetails()
          }
        }}
        onClick={onOpenDetails}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
        style={{
          rotateX: prefersReduced ? 0 : rotateX,
          rotateY: prefersReduced ? 0 : rotateY,
          transformStyle: 'preserve-3d',
          position: 'relative',
          width: '100%',
          aspectRatio: '3 / 4.2',
          borderRadius: '22px',
          background: `linear-gradient(180deg, ${colors.deepNavy} 0%, ${colors.ink} 100%)`,
          border: isCaptain ? `1px solid rgba(247,148,29,0.55)` : `1px solid ${colors.glassBorder}`,
          boxShadow: isCaptain
            ? '0 16px 36px rgba(0,0,0,0.55), 0 0 22px rgba(247,148,29,0.22)'
            : '0 12px 32px rgba(0,0,0,0.45)',
          overflow: 'hidden',
          cursor: 'pointer',
          outline: 'none',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '16px',
        }}
      >
        {/* Moving light sheen */}
        {!prefersReduced && (
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle 240px at 50% 50%, rgba(255,255,255,0.25) 0%, transparent 80%)',
              opacity: sheenOpacity,
              pointerEvents: 'none',
              zIndex: 5,
            }}
          />
        )}

        {/* 1. Giant Outlined Jersey Number (Sitting behind the player photo) */}
        {member.jersey_number !== null && member.jersey_number !== undefined && (
          <span
            style={{
              position: 'absolute',
              top: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              fontFamily: fonts.heading,
              fontWeight: 800,
              fontSize: 'clamp(96px, 12vw, 136px)',
              lineHeight: 1,
              color: 'transparent',
              WebkitTextStroke: '2px rgba(255,255,255,0.22)',
              userSelect: 'none',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {member.jersey_number}
          </span>
        )}

        {/* 2. Player Photo Cutout with Gradient Fade */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          {player?.photo_url ? (
            <img
              src={player.photo_url}
              alt={player.full_name}
              style={{
                width: '100%',
                height: '84%',
                objectFit: 'cover',
                objectPosition: 'top center',
                maskImage: 'linear-gradient(to bottom, black 58%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 58%, transparent 100%)',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '75%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'radial-gradient(circle, rgba(47,52,112,0.6) 0%, transparent 70%)',
              }}
            >
              <span
                style={{
                  fontFamily: fonts.heading,
                  fontSize: '52px',
                  fontWeight: 700,
                  color: colors.orange,
                  opacity: 0.85,
                }}
              >
                {getInitials(player?.full_name ?? '')}
              </span>
            </div>
          )}
        </div>

        {/* 3. Bottom Gradient Shadow for crystal-clear typography readability */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '45%',
            background: `linear-gradient(to top, ${colors.ink} 0%, rgba(11,13,38,0.88) 45%, transparent 100%)`,
            zIndex: 3,
            pointerEvents: 'none',
          }}
        />

        {/* 4. Top Badges & Actions */}
        <div
          style={{
            position: 'relative',
            zIndex: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {/* Team Badge */}
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '999px',
                background: isWomen ? 'rgba(244,114,182,0.18)' : 'rgba(56,189,248,0.18)',
                border: `1px solid ${isWomen ? 'rgba(244,114,182,0.45)' : 'rgba(56,189,248,0.45)'}`,
                color: isWomen ? '#f472b6' : '#38bdf8',
                fontSize: '10.5px',
                fontWeight: 700,
                letterSpacing: '0.02em',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                fontFamily: fonts.body,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              🏑 {team === "Women's Team" ? "Women's" : "Men's"}
            </span>

            {/* Position Badge */}
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.1)',
                border: `1px solid ${colors.glassBorder}`,
                color: '#ffffff',
                fontSize: '10.5px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                fontFamily: fonts.body,
              }}
            >
              {member.position}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Captain / Vice Captain Badge */}
            {isCaptain && (
              <span
                title="Captain"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '999px',
                  background: colors.orange,
                  color: colors.deepNavy,
                  fontWeight: 800,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 12px ${colors.orange}`,
                  fontFamily: fonts.heading,
                }}
              >
                C
              </span>
            )}
            {!isCaptain && isViceCaptain && (
              <span
                title="Vice Captain"
                style={{
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: colors.orange,
                  color: colors.deepNavy,
                  fontWeight: 800,
                  fontSize: '11px',
                  boxShadow: `0 0 10px ${colors.orange}`,
                  fontFamily: fonts.heading,
                }}
              >
                VC
              </span>
            )}

            {/* Admin Actions */}
            {(onEdit || onDelete) && (
              <RowActions onEdit={onEdit} onDelete={onDelete} />
            )}
          </div>
        </div>

        {/* 5. Bottom Player Details */}
        <div style={{ position: 'relative', zIndex: 4 }}>
          <h4
            style={{
              fontFamily: fonts.heading,
              fontWeight: 600,
              fontSize: '18px',
              color: '#ffffff',
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            {player?.full_name ?? 'Player'}
          </h4>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: '12.5px',
              color: colors.textSoft,
              margin: '4px 0 0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {player?.faculty || 'Faculty of Science'}
            {player?.academic_year ? ` · ${player.academic_year}` : ''}
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Team() {
  const { user } = useAuth()

  // 1. Tournaments List
  const {
    rows: tournaments,
    loading: tournamentsLoading,
    error: tournamentsError,
    add: addTournament,
    update: updateTournament,
    remove: removeTournament,
  } = useTable<Tournament>('tournaments', { orderBy: 'season_year', ascending: false })

  // Sort tournaments: season_year desc, then start_date desc
  const sortedTournaments = useMemo(() => {
    return [...tournaments].sort((a, b) => {
      if (b.season_year !== a.season_year) return b.season_year - a.season_year
      if (b.start_date && a.start_date) return new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      return 0
    })
  }, [tournaments])

  // Selected Tournament State
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null)

  useEffect(() => {
    if (sortedTournaments.length > 0) {
      if (!selectedTournamentId || !sortedTournaments.some((t) => t.id === selectedTournamentId)) {
        const activeOne = sortedTournaments.find((t) => t.is_active)
        setSelectedTournamentId(activeOne ? activeOne.id : sortedTournaments[0].id)
      }
    } else {
      setSelectedTournamentId(null)
    }
  }, [sortedTournaments, selectedTournamentId])

  const selectedTournament = useMemo(() => {
    return sortedTournaments.find((t) => t.id === selectedTournamentId) ?? null
  }, [sortedTournaments, selectedTournamentId])

  // 2. Squad Members List for Selected Tournament
  const {
    rows: squadMembers,
    loading: squadLoading,
    error: squadError,
    add: addSquadMember,
    update: updateSquadMember,
    remove: removeSquadMember,
  } = useTable<SquadMember>('squad_members', {
    select: '*, players(*)',
    eq: selectedTournamentId ? { tournament_id: selectedTournamentId } : undefined,
    orderBy: 'jersey_number',
    ascending: true,
  })

  // 3. Team & Position Filter State
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<'All' | SquadTeam>('All')
  const [positionFilter, setPositionFilter] = useState<'All' | Position>('All')

  // Filter squad by selected team
  const squadForSelectedTeam = useMemo(() => {
    if (selectedTeamFilter === 'All') return squadMembers
    return squadMembers.filter((m) => getSquadMemberTeam(m) === selectedTeamFilter)
  }, [squadMembers, selectedTeamFilter])

  // Filtered squad by position within selected team
  const filteredSquad = useMemo(() => {
    if (positionFilter === 'All') return squadForSelectedTeam
    return squadForSelectedTeam.filter((m) => m.position === positionFilter)
  }, [squadForSelectedTeam, positionFilter])

  // Team counts for current tournament squad
  const teamCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: squadMembers.length,
      "Men's Team": 0,
      "Women's Team": 0,
    }
    for (const m of squadMembers) {
      const t = getSquadMemberTeam(m)
      counts[t] = (counts[t] || 0) + 1
    }
    return counts
  }, [squadMembers])

  // Position counts (scoped to selected team)
  const positionCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: squadForSelectedTeam.length,
      Goalkeeper: 0,
      Defender: 0,
      Midfielder: 0,
      Forward: 0,
    }
    for (const m of squadForSelectedTeam) {
      if (counts[m.position] !== undefined) {
        counts[m.position]++
      }
    }
    return counts
  }, [squadForSelectedTeam])

  // 4. Master Players List (for "Pick existing player" tab)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)

  const loadAllPlayers = async () => {
    setLoadingPlayers(true)
    const { data } = await supabase.from('players').select('*').order('full_name', { ascending: true })
    if (data) setAllPlayers(data as Player[])
    setLoadingPlayers(false)
  }

  // 5. Modals State
  // (a) Tournament Modal (Add / Edit)
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)
  const [tName, setTName] = useState('')
  const [tSeasonYear, setTSeasonYear] = useState<number>(new Date().getFullYear())
  const [tLocation, setTLocation] = useState('')
  const [tStartDate, setTStartDate] = useState('')
  const [tEndDate, setTEndDate] = useState('')
  const [tDescription, setTDescription] = useState('')
  const [tIsActive, setTIsActive] = useState(false)
  const [savingTournament, setSavingTournament] = useState(false)
  const [tournamentFormError, setTournamentFormError] = useState<string | null>(null)

  // (b) Tournament Delete Confirm
  const [deletingTournament, setDeletingTournament] = useState<Tournament | null>(null)
  const [deletingTournamentBusy, setDeletingTournamentBusy] = useState(false)

  // (c) Add/Edit Squad Player Modal
  const [isSquadModalOpen, setIsSquadModalOpen] = useState(false)
  const [squadModalTab, setSquadModalTab] = useState<'existing' | 'new'>('existing')
  const [editingMember, setEditingMember] = useState<SquadMember | null>(null)

  // Squad form fields
  const [formTeamType, setFormTeamType] = useState<SquadTeam>("Men's Team")
  const [formJersey, setFormJersey] = useState<number | ''>('')
  const [formPosition, setFormPosition] = useState<Position>('Forward')
  const [formIsCaptain, setFormIsCaptain] = useState(false)
  const [formIsViceCaptain, setFormIsViceCaptain] = useState(false)

  // Existing player search
  const [selectedExistingPlayerId, setSelectedExistingPlayerId] = useState<string>('')
  const [playerSearchQuery, setPlayerSearchQuery] = useState('')

  // New player fields
  const [pFullName, setPFullName] = useState('')
  const [pPhotoUrl, setPPhotoUrl] = useState<string | null>(null)
  const [pFaculty, setPFaculty] = useState('')
  const [pAcademicYear, setPAcademicYear] = useState('')
  const [pBio, setPBio] = useState('')

  const [savingSquad, setSavingSquad] = useState(false)
  const [squadFormError, setSquadFormError] = useState<string | null>(null)

  // (d) Delete Squad Member Confirm Modal
  const [deletingMember, setDeletingMember] = useState<SquadMember | null>(null)
  const [alsoDeletePlayerPermanent, setAlsoDeletePlayerPermanent] = useState(false)
  const [deletingMemberBusy, setDeletingMemberBusy] = useState(false)

  // (e) Player Detail Modal
  const [viewingMember, setViewingMember] = useState<SquadMember | null>(null)

  // --- Handlers: Tournament ---
  const openAddTournament = () => {
    setEditingTournament(null)
    setTName('')
    setTSeasonYear(new Date().getFullYear())
    setTLocation('')
    setTStartDate('')
    setTEndDate('')
    setTDescription('')
    setTIsActive(tournaments.length === 0)
    setTournamentFormError(null)
    setIsTournamentModalOpen(true)
  }

  const openEditTournament = (t: Tournament) => {
    setEditingTournament(t)
    setTName(t.name)
    setTSeasonYear(t.season_year)
    setTLocation(t.location ?? '')
    setTStartDate(t.start_date ?? '')
    setTEndDate(t.end_date ?? '')
    setTDescription(t.description ?? '')
    setTIsActive(t.is_active)
    setTournamentFormError(null)
    setIsTournamentModalOpen(true)
  }

  const handleSaveTournament = async (e: FormEvent) => {
    e.preventDefault()
    setSavingTournament(true)
    setTournamentFormError(null)

    // If setting active, clear other tournaments' is_active
    if (tIsActive) {
      await supabase.from('tournaments').update({ is_active: false }).neq('id', 'placeholder')
    }

    const payload = {
      name: tName.trim(),
      season_year: Number(tSeasonYear),
      location: tLocation.trim() || null,
      start_date: tStartDate || null,
      end_date: tEndDate || null,
      description: tDescription.trim() || null,
      is_active: tIsActive,
    }

    let err: string | null = null
    if (editingTournament) {
      err = await updateTournament(editingTournament.id, payload)
    } else {
      err = await addTournament(payload)
    }

    if (err) {
      setTournamentFormError(err)
      setSavingTournament(false)
    } else {
      setSavingTournament(false)
      setIsTournamentModalOpen(false)
      setEditingTournament(null)
    }
  }

  const handleDeleteTournament = async () => {
    if (!deletingTournament) return
    setDeletingTournamentBusy(true)
    await removeTournament(deletingTournament.id)
    setDeletingTournamentBusy(false)
    setDeletingTournament(null)
  }

  // --- Handlers: Squad Member ---
  const openAddSquadModal = () => {
    void loadAllPlayers()
    setEditingMember(null)
    setSquadModalTab('existing')
    setFormTeamType(selectedTeamFilter === "Women's Team" ? "Women's Team" : "Men's Team")
    setFormJersey('')
    setFormPosition('Forward')
    setFormIsCaptain(false)
    setFormIsViceCaptain(false)
    setSelectedExistingPlayerId('')
    setPlayerSearchQuery('')
    setPFullName('')
    setPPhotoUrl(null)
    setPFaculty('')
    setPAcademicYear('')
    setPBio('')
    setSquadFormError(null)
    setIsSquadModalOpen(true)
  }

  const openEditSquadModal = (member: SquadMember) => {
    setEditingMember(member)
    setSquadModalTab('new')
    setFormTeamType(getSquadMemberTeam(member))
    setFormJersey(member.jersey_number ?? '')
    setFormPosition(member.position)
    setFormIsCaptain(member.is_captain)
    setFormIsViceCaptain(member.is_vice_captain)
    const p = member.players
    setPFullName(p?.full_name ?? '')
    setPPhotoUrl(p?.photo_url ?? null)
    setPFaculty(p?.faculty ?? '')
    setPAcademicYear(p?.academic_year ?? '')
    setPBio(cleanPlayerBio(p?.bio) ?? '')
    setSquadFormError(null)
    setIsSquadModalOpen(true)
  }

  const handleSaveSquadMember = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedTournamentId) return
    setSavingSquad(true)
    setSquadFormError(null)

    try {
      // Captain / Vice Captain exclusivity rule scoped to tournament AND team
      if (formIsCaptain) {
        const existingCaptains = squadMembers.filter(
          (m) => getSquadMemberTeam(m) === formTeamType && m.is_captain && (!editingMember || m.id !== editingMember.id)
        )
        for (const cap of existingCaptains) {
          await supabase.from('squad_members').update({ is_captain: false }).eq('id', cap.id)
        }
      }
      if (formIsViceCaptain) {
        const existingVCs = squadMembers.filter(
          (m) => getSquadMemberTeam(m) === formTeamType && m.is_vice_captain && (!editingMember || m.id !== editingMember.id)
        )
        for (const vc of existingVCs) {
          await supabase.from('squad_members').update({ is_vice_captain: false }).eq('id', vc.id)
        }
      }

      const cleanBioText = cleanPlayerBio(pBio) ?? ''
      const fallbackBio = `[Team: ${formTeamType}]${cleanBioText ? ' ' + cleanBioText : ''}`

      if (editingMember) {
        // 1. Update player's own details in 'players'
        if (editingMember.player_id) {
          const { error: pUpdateErr } = await supabase.from('players').update({
            full_name: pFullName.trim(),
            photo_url: pPhotoUrl,
            faculty: pFaculty.trim() || null,
            academic_year: pAcademicYear.trim() || null,
            bio: cleanBioText || null,
            team_type: formTeamType,
          }).eq('id', editingMember.player_id)

          if (pUpdateErr && (pUpdateErr.message.includes('team_type') || pUpdateErr.message.includes('column') || pUpdateErr.code === '42703')) {
            await supabase.from('players').update({
              full_name: pFullName.trim(),
              photo_url: pPhotoUrl,
              faculty: pFaculty.trim() || null,
              academic_year: pAcademicYear.trim() || null,
              bio: fallbackBio || null,
            }).eq('id', editingMember.player_id)
          }
        }

        // 2. Update squad member row
        let err = await updateSquadMember(editingMember.id, {
          jersey_number: formJersey === '' ? null : Number(formJersey),
          position: formPosition,
          is_captain: formIsCaptain,
          is_vice_captain: formIsViceCaptain,
          team_type: formTeamType,
        })

        if (err && (err.includes('team_type') || err.includes('column') || err.includes('42703'))) {
          err = await updateSquadMember(editingMember.id, {
            jersey_number: formJersey === '' ? null : Number(formJersey),
            position: formPosition,
            is_captain: formIsCaptain,
            is_vice_captain: formIsViceCaptain,
          })
        }

        if (err) throw new Error(err)
      } else {
        // Adding new squad member
        let finalPlayerId = selectedExistingPlayerId

        if (squadModalTab === 'new') {
          // Check if player with same name already exists in players table
          const existingPlayer = allPlayers.find(
            (p) => p.full_name.trim().toLowerCase() === pFullName.trim().toLowerCase()
          )

          if (existingPlayer) {
            // Player already exists in players table; update latest details and reuse ID
            await supabase.from('players').update({
              photo_url: pPhotoUrl || existingPlayer.photo_url,
              faculty: pFaculty.trim() || existingPlayer.faculty,
              academic_year: pAcademicYear.trim() || existingPlayer.academic_year,
              bio: cleanBioText || existingPlayer.bio,
              team_type: formTeamType,
            }).eq('id', existingPlayer.id)
            finalPlayerId = existingPlayer.id
          } else {
            const { data: newP, error: pErr } = await supabase
              .from('players')
              .insert({
                full_name: pFullName.trim(),
                photo_url: pPhotoUrl,
                faculty: pFaculty.trim() || null,
                academic_year: pAcademicYear.trim() || null,
                bio: cleanBioText || null,
                team_type: formTeamType,
              })
              .select('id')
              .single()

            if (pErr && (pErr.message.includes('team_type') || pErr.message.includes('column') || pErr.code === '42703')) {
              const { data: fbP, error: fbErr } = await supabase
                .from('players')
                .insert({
                  full_name: pFullName.trim(),
                  photo_url: pPhotoUrl,
                  faculty: pFaculty.trim() || null,
                  academic_year: pAcademicYear.trim() || null,
                  bio: fallbackBio || null,
                })
                .select('id')
                .single()

              if (fbErr) throw new Error(fbErr.message)
              finalPlayerId = fbP.id
            } else if (pErr) {
              throw new Error(pErr.message)
            } else {
              finalPlayerId = newP.id
            }
          }
        }

        if (!finalPlayerId) {
          throw new Error('Please select an existing player or fill in player details.')
        }

        // Insert into squad_members
        let err = await addSquadMember({
          tournament_id: selectedTournamentId,
          player_id: finalPlayerId,
          jersey_number: formJersey === '' ? null : Number(formJersey),
          position: formPosition,
          is_captain: formIsCaptain,
          is_vice_captain: formIsViceCaptain,
          team_type: formTeamType,
        })

        if (err && (err.includes('team_type') || err.includes('column') || err.includes('42703'))) {
          err = await addSquadMember({
            tournament_id: selectedTournamentId,
            player_id: finalPlayerId,
            jersey_number: formJersey === '' ? null : Number(formJersey),
            position: formPosition,
            is_captain: formIsCaptain,
            is_vice_captain: formIsViceCaptain,
          })
        }

        if (err) throw new Error(err)
      }

      setIsSquadModalOpen(false)
      setEditingMember(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const lower = msg.toLowerCase()
      if (lower.includes('one_captain_per_squad') || (lower.includes('captain') && !lower.includes('vice'))) {
        setSquadFormError(`There is already a captain assigned for the ${formTeamType}.`)
      } else if (lower.includes('one_vice_captain_per_squad') || lower.includes('vice_captain') || lower.includes('vice-captain')) {
        setSquadFormError(`There is already a vice captain assigned for the ${formTeamType}.`)
      } else if (lower.includes('jersey') || lower.includes('squad_members_tournament_team_jersey_unique')) {
        setSquadFormError('That jersey number is already taken in this team\'s squad.')
      } else if (lower.includes('tournament_id_player_id')) {
        setSquadFormError('This player is already in this tournament squad.')
      } else if (msg.includes('23505') || lower.includes('duplicate key')) {
        setSquadFormError('A player with these details already exists in this squad.')
      } else {
        setSquadFormError(msg)
      }
    } finally {
      setSavingSquad(false)
    }
  }

  const handleDeleteSquadMember = async () => {
    if (!deletingMember) return
    setDeletingMemberBusy(true)

    // 1. Remove from squad_members
    await removeSquadMember(deletingMember.id)

    // 2. If permanent deletion requested: delete from players and storage
    if (alsoDeletePlayerPermanent && deletingMember.player_id) {
      await supabase.from('players').delete().eq('id', deletingMember.player_id)
      if (deletingMember.players?.photo_url) {
        await deleteImageByUrl(deletingMember.players.photo_url)
      }
    }

    setDeletingMemberBusy(false)
    setDeletingMember(null)
    setAlsoDeletePlayerPermanent(false)
  }

  // Filter available existing players (not yet in current squad)
  const availableExistingPlayers = useMemo(() => {
    const assignedIds = new Set(squadMembers.map((m) => m.player_id))
    return allPlayers.filter((p) => {
      if (assignedIds.has(p.id)) return false
      if (!playerSearchQuery) return true
      const q = playerSearchQuery.toLowerCase()
      return p.full_name.toLowerCase().includes(q) || (p.faculty && p.faculty.toLowerCase().includes(q))
    })
  }, [allPlayers, squadMembers, playerSearchQuery])

  return (
    <SectionShell
      id="team"
      alt
      eyebrow="The Squad"
      title="Meet the Team"
      addLabel="Add tournament"
      onAdd={user ? openAddTournament : undefined}
    >
      {/* 1. TOURNAMENT SELECTOR PILLS */}
      {tournamentsError ? (
        <div style={{ marginBottom: '30px' }}>
          <EmptyState message={`Failed to load tournaments: ${tournamentsError}`} />
        </div>
      ) : tournamentsLoading ? (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '140px',
                height: '36px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.06)',
              }}
            />
          ))}
        </div>
      ) : sortedTournaments.length === 0 ? (
        <div style={{ marginBottom: '40px' }}>
          <EmptyState message="No tournaments registered yet. Click '+ Add tournament' to get started." />
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '12px',
            marginBottom: '20px',
            scrollbarWidth: 'none',
          }}
        >
          {sortedTournaments.map((t) => {
            const isSelected = t.id === selectedTournamentId
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTournamentId(t.id)}
                style={{
                  padding: '8px 20px',
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{t.name}</span>
                <span style={{ fontSize: '11px', opacity: 0.85 }}>({t.season_year})</span>
                {t.is_active && (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '999px',
                      background: isSelected ? colors.deepNavy : colors.orange,
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* 2. SELECTED TOURNAMENT GLASS HEADER STRIP */}
      {selectedTournament && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${colors.glassBorder}`,
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            marginBottom: '28px',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h3 style={{ fontFamily: fonts.heading, fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: 0 }}>
              {selectedTournament.name}
            </h3>
            <span style={{ fontSize: '13px', color: colors.orange, fontWeight: 700 }}>
              {selectedTournament.season_year}
            </span>
            {selectedTournament.is_active && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: colors.orange,
                  color: colors.deepNavy,
                  letterSpacing: '0.04em',
                }}
              >
                Active
              </span>
            )}
            {selectedTournament.location && (
              <span style={{ fontSize: '13px', color: colors.textSoft }}>
                📍 {selectedTournament.location}
              </span>
            )}
            {(selectedTournament.start_date || selectedTournament.end_date) && (
              <span style={{ fontSize: '13px', color: colors.textSoft }}>
                🗓️ {selectedTournament.start_date ? fmtDate(selectedTournament.start_date) : ''}
                {selectedTournament.end_date ? ` – ${fmtDate(selectedTournament.end_date)}` : ''}
              </span>
            )}
            <span
              style={{
                fontSize: '12px',
                color: colors.grey,
                background: 'rgba(255,255,255,0.08)',
                padding: '3px 10px',
                borderRadius: '999px',
                fontFamily: fonts.body,
              }}
            >
              {squadMembers.length} {squadMembers.length === 1 ? 'Player' : 'Players'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {user && (
              <>
                <button
                  type="button"
                  onClick={openAddSquadModal}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '999px',
                    background: colors.orange,
                    color: colors.deepNavy,
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    fontFamily: fonts.body,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(247,148,29,0.3)',
                  }}
                >
                  + Add player to squad
                </button>
                <RowActions
                  onEdit={() => openEditTournament(selectedTournament)}
                  onDelete={() => setDeletingTournament(selectedTournament)}
                />
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* 3. TEAM & POSITION FILTER STRIP */}
      {selectedTournament && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
          {/* Team Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: colors.textSoft,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginRight: '4px',
              }}
            >
              Team:
            </span>
            {(['All', ...SQUAD_TEAMS] as const).map((team) => {
              const isSelected = selectedTeamFilter === team
              const isWomen = team === "Women's Team"
              const count = teamCounts[team] ?? 0
              return (
                <button
                  key={team}
                  type="button"
                  onClick={() => setSelectedTeamFilter(team)}
                  style={{
                    padding: '7px 18px',
                    borderRadius: '999px',
                    background: isSelected
                      ? isWomen
                        ? '#f472b6'
                        : colors.orange
                      : 'rgba(255,255,255,0.06)',
                    color: isSelected ? colors.deepNavy : '#ffffff',
                    fontWeight: isSelected ? 800 : 500,
                    border: isSelected
                      ? 'none'
                      : `1px solid ${colors.glassBorder}`,
                    fontSize: '12.5px',
                    fontFamily: fonts.body,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: isSelected
                      ? isWomen
                        ? '0 4px 18px rgba(244,114,182,0.35)'
                        : '0 4px 18px rgba(247,148,29,0.35)'
                      : 'none',
                  }}
                >
                  <span>🏑</span>
                  <span>{team === 'All' ? 'All Squads' : team}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      opacity: 0.85,
                      fontWeight: 700,
                      background: isSelected ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.1)',
                      padding: '1px 7px',
                      borderRadius: '999px',
                    }}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Position Filter Chips */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: colors.textSoft,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginRight: '4px',
              }}
            >
              Position:
            </span>
            {(['All', ...POSITIONS] as const).map((pos) => {
              const isSelected = positionFilter === pos
              const count = positionCounts[pos] ?? 0
              return (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setPositionFilter(pos)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '999px',
                    background: isSelected ? 'rgba(247,148,29,0.2)' : 'rgba(255,255,255,0.04)',
                    color: isSelected ? colors.orange : colors.grey,
                    fontWeight: isSelected ? 700 : 500,
                    border: isSelected ? `1px solid ${colors.orange}` : `1px solid ${colors.glassBorder}`,
                    fontSize: '12px',
                    fontFamily: fonts.body,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {pos === 'All' ? 'All' : `${pos}s`} ({count})
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. SQUAD CARDS GRID */}
      {squadError ? (
        <EmptyState message={`Failed to load squad: ${squadError}`} />
      ) : squadLoading ? (
        /* Loading Skeletons */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
            gap: '24px',
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.35, 0.7, 0.35] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              style={{
                aspectRatio: '3 / 4.2',
                borderRadius: '22px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${colors.glassBorder}`,
              }}
            />
          ))}
        </div>
      ) : filteredSquad.length === 0 ? (
        <EmptyState
          message={
            squadMembers.length === 0
              ? 'Squad not announced yet.'
              : selectedTeamFilter !== 'All' && positionFilter !== 'All'
              ? `No ${positionFilter.toLowerCase()}s found in ${selectedTeamFilter}.`
              : selectedTeamFilter !== 'All'
              ? `No players registered for ${selectedTeamFilter} in this tournament yet.`
              : `No players found in position "${positionFilter}".`
          }
        />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedTournamentId}-${selectedTeamFilter}-${positionFilter}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
              gap: '24px',
            }}
          >
            {filteredSquad.map((member, idx) => (
              <TradingCard
                key={member.id}
                member={member}
                index={idx}
                onOpenDetails={() => setViewingMember(member)}
                onEdit={user ? () => openEditSquadModal(member) : undefined}
                onDelete={user ? () => setDeletingMember(member) : undefined}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* DETAIL MODAL (Click on card) */}
      <Modal
        open={!!viewingMember}
        title={viewingMember?.players?.full_name ?? 'Player Profile'}
        onClose={() => setViewingMember(null)}
        width={520}
      >
        {viewingMember && (
          <div>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '22px' }}>
              {/* Photo preview */}
              <div
                style={{
                  width: '120px',
                  aspectRatio: '3 / 4.2',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: `linear-gradient(180deg, ${colors.deepNavy}, ${colors.ink})`,
                  border: viewingMember.is_captain ? `1px solid ${colors.orange}` : `1px solid ${colors.glassBorder}`,
                  position: 'relative',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {viewingMember.jersey_number !== null && viewingMember.jersey_number !== undefined && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '15%',
                      fontFamily: fonts.heading,
                      fontWeight: 800,
                      fontSize: '48px',
                      color: 'transparent',
                      WebkitTextStroke: '1px rgba(255,255,255,0.25)',
                    }}
                  >
                    {viewingMember.jersey_number}
                  </span>
                )}
                {viewingMember.players?.photo_url ? (
                  <img
                    src={viewingMember.players.photo_url}
                    alt={viewingMember.players.full_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 2 }}
                  />
                ) : (
                  <span style={{ fontFamily: fonts.heading, fontSize: '32px', fontWeight: 700, color: colors.orange }}>
                    {getInitials(viewingMember.players?.full_name ?? '')}
                  </span>
                )}
              </div>

              {/* Player details */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {/* Team Badge */}
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '999px',
                      background: getSquadMemberTeam(viewingMember) === "Women's Team" ? 'rgba(244,114,182,0.18)' : 'rgba(56,189,248,0.18)',
                      color: getSquadMemberTeam(viewingMember) === "Women's Team" ? '#f472b6' : '#38bdf8',
                      border: `1px solid ${getSquadMemberTeam(viewingMember) === "Women's Team" ? 'rgba(244,114,182,0.45)' : 'rgba(56,189,248,0.45)'}`,
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    🏑 {getSquadMemberTeam(viewingMember)}
                  </span>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '999px',
                      background: colors.orange,
                      color: colors.deepNavy,
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    {viewingMember.position}
                  </span>
                  {viewingMember.jersey_number !== null && (
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '999px',
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      Jersey #{viewingMember.jersey_number}
                    </span>
                  )}
                  {viewingMember.is_captain && (
                    <span
                      style={{
                        padding: '3px 9px',
                        borderRadius: '999px',
                        background: colors.orange,
                        color: colors.deepNavy,
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      Captain
                    </span>
                  )}
                  {viewingMember.is_vice_captain && (
                    <span
                      style={{
                        padding: '3px 9px',
                        borderRadius: '999px',
                        background: colors.orange,
                        color: colors.deepNavy,
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      Vice Captain
                    </span>
                  )}
                </div>

                <h4 style={{ fontFamily: fonts.heading, fontSize: '22px', fontWeight: 600, color: '#fff', margin: '0 0 6px' }}>
                  {viewingMember.players?.full_name}
                </h4>

                <p style={{ fontFamily: fonts.body, fontSize: '13.5px', color: colors.textSoft, margin: 0 }}>
                  {viewingMember.players?.faculty || 'University of Ruhuna'}
                  {viewingMember.players?.academic_year ? ` · ${viewingMember.players.academic_year}` : ''}
                </p>

                {selectedTournament && (
                  <p style={{ fontFamily: fonts.body, fontSize: '12px', color: colors.orange, margin: '8px 0 0' }}>
                    🏆 {selectedTournament.name} ({selectedTournament.season_year})
                  </p>
                )}
              </div>
            </div>

            {cleanPlayerBio(viewingMember.players?.bio) && (
              <div style={{ paddingTop: '16px', borderTop: `1px solid ${colors.glassBorder}` }}>
                <h5
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: colors.orange,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '8px',
                  }}
                >
                  Player Bio & Background
                </h5>
                <p style={{ fontFamily: fonts.body, fontSize: '14px', lineHeight: 1.65, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
                  {cleanPlayerBio(viewingMember.players?.bio)}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* TOURNAMENT FORM MODAL (Admin) */}
      <Modal
        open={isTournamentModalOpen}
        title={editingTournament ? 'Edit Tournament' : 'Add Tournament'}
        onClose={() => setIsTournamentModalOpen(false)}
        width={540}
      >
        <form onSubmit={handleSaveTournament}>
          <Field label="Tournament Name">
            <input
              type="text"
              required
              value={tName}
              onChange={(e) => setTName(e.target.value)}
              style={inputStyle}
              placeholder="e.g. Sri Lanka University Games (SLUG)"
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Season Year">
              <input
                type="number"
                required
                min={2000}
                max={2100}
                value={tSeasonYear}
                onChange={(e) => setTSeasonYear(Number(e.target.value))}
                style={inputStyle}
              />
            </Field>

            <Field label="Location">
              <input
                type="text"
                value={tLocation}
                onChange={(e) => setTLocation(e.target.value)}
                style={inputStyle}
                placeholder="e.g. Colombo, Sri Lanka"
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Start Date">
              <input
                type="date"
                value={tStartDate}
                onChange={(e) => setTStartDate(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="End Date">
              <input
                type="date"
                value={tEndDate}
                onChange={(e) => setTEndDate(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Description (Optional)">
            <textarea
              rows={3}
              value={tDescription}
              onChange={(e) => setTDescription(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Details about the tournament and team objectives..."
            />
          </Field>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: '16px 0 20px',
              cursor: 'pointer',
              fontFamily: fonts.body,
              fontSize: '13.5px',
              color: '#ffffff',
            }}
          >
            <input
              type="checkbox"
              checked={tIsActive}
              onChange={(e) => setTIsActive(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: colors.orange }}
            />
            <span>Set as current <strong>Active Tournament</strong> (will be selected by default)</span>
          </label>

          <FormError message={tournamentFormError} />

          <FormActions
            onCancel={() => setIsTournamentModalOpen(false)}
            saving={savingTournament}
            submitLabel={editingTournament ? 'Update Tournament' : 'Create Tournament'}
          />
        </form>
      </Modal>

      {/* CONFIRM DELETE TOURNAMENT (Admin) */}
      <ConfirmDialog
        open={!!deletingTournament}
        message={`Are you sure you want to delete "${deletingTournament?.name}" (${deletingTournament?.season_year})? This will also remove its squad members and unlink all associated fixtures.`}
        busy={deletingTournamentBusy}
        onConfirm={() => void handleDeleteTournament()}
        onCancel={() => setDeletingTournament(null)}
      />

      {/* SQUAD MEMBER FORM MODAL (Admin) */}
      <Modal
        open={isSquadModalOpen}
        title={editingMember ? 'Edit Squad Player' : 'Add Player to Squad'}
        onClose={() => setIsSquadModalOpen(false)}
        width={580}
      >
        <form onSubmit={handleSaveSquadMember}>
          {/* Team / Squad Selection */}
          <div style={{ marginBottom: '18px' }}>
            <Field label="Team / Squad" hint="Specify whether this player belongs to Men's Team or Women's Team">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {SQUAD_TEAMS.map((team) => {
                  const active = formTeamType === team
                  const isWomen = team === "Women's Team"
                  return (
                    <button
                      key={team}
                      type="button"
                      onClick={() => setFormTeamType(team)}
                      style={{
                        padding: '11px 16px',
                        borderRadius: '12px',
                        background: active
                          ? isWomen
                            ? 'rgba(244,114,182,0.22)'
                            : colors.orange
                          : 'rgba(255,255,255,0.06)',
                        color: active ? (isWomen ? '#fff' : colors.deepNavy) : '#ffffff',
                        border: active
                          ? `1.5px solid ${isWomen ? '#f472b6' : colors.orange}`
                          : `1px solid ${colors.glassBorder}`,
                        fontWeight: active ? 800 : 500,
                        fontSize: '13.5px',
                        cursor: 'pointer',
                        fontFamily: fonts.body,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: active
                          ? isWomen
                            ? '0 0 16px rgba(244,114,182,0.3)'
                            : '0 0 16px rgba(247,148,29,0.3)'
                          : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span style={{ fontSize: '15px' }}>🏑</span>
                      <span>{team}</span>
                    </button>
                  )
                })}
              </div>
            </Field>
          </div>

          {/* Tabs for Adding (Pick existing vs Create new) */}
          {!editingMember && (
            <div
              style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '4px',
                marginBottom: '20px',
              }}
            >
              <button
                type="button"
                onClick={() => setSquadModalTab('existing')}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '10px',
                  background: squadModalTab === 'existing' ? colors.orange : 'transparent',
                  color: squadModalTab === 'existing' ? colors.deepNavy : '#ffffff',
                  fontWeight: squadModalTab === 'existing' ? 700 : 500,
                  border: 'none',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontFamily: fonts.body,
                  transition: 'all 0.2s',
                }}
              >
                Pick Existing Player
              </button>
              <button
                type="button"
                onClick={() => setSquadModalTab('new')}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '10px',
                  background: squadModalTab === 'new' ? colors.orange : 'transparent',
                  color: squadModalTab === 'new' ? colors.deepNavy : '#ffffff',
                  fontWeight: squadModalTab === 'new' ? 700 : 500,
                  border: 'none',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontFamily: fonts.body,
                  transition: 'all 0.2s',
                }}
              >
                Create New Player
              </button>
            </div>
          )}

          {/* TAB 1: PICK EXISTING PLAYER */}
          {!editingMember && squadModalTab === 'existing' && (
            <div style={{ marginBottom: '18px' }}>
              <Field label="Search & Select Player">
                <input
                  type="text"
                  placeholder="Filter by player name or faculty..."
                  value={playerSearchQuery}
                  onChange={(e) => setPlayerSearchQuery(e.target.value)}
                  style={{ ...inputStyle, marginBottom: '8px' }}
                />
                <select
                  required
                  value={selectedExistingPlayerId}
                  onChange={(e) => {
                    const chosenId = e.target.value
                    setSelectedExistingPlayerId(chosenId)
                    const chosenP = allPlayers.find((p) => p.id === chosenId)
                    if (chosenP) {
                      const detectedTeam =
                        chosenP.team_type ||
                        (chosenP.bio && /\[Team:\s*Women's(?:\s*Team)?\]/i.test(chosenP.bio) ? "Women's Team" : "Men's Team")
                      setFormTeamType(detectedTeam as SquadTeam)
                    }
                  }}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="" disabled style={{ background: colors.deepNavy }}>
                    {loadingPlayers
                      ? 'Loading players...'
                      : availableExistingPlayers.length === 0
                      ? 'No available unassigned players found'
                      : '-- Select a player --'}
                  </option>
                  {availableExistingPlayers.map((p) => {
                    const pTeam =
                      p.team_type ||
                      (p.bio && /\[Team:\s*Women's(?:\s*Team)?\]/i.test(p.bio) ? "Women's Team" : "Men's Team")
                    return (
                      <option key={p.id} value={p.id} style={{ background: colors.deepNavy, color: '#fff' }}>
                        {p.full_name} {p.faculty ? `(${p.faculty})` : ''} · {pTeam}
                      </option>
                    )
                  })}
                </select>
              </Field>
            </div>
          )}

          {/* TAB 2 or EDITING: PLAYER DETAILS */}
          {(editingMember || squadModalTab === 'new') && (
            <div>
              <Field label="Full Name">
                <input
                  type="text"
                  required
                  value={pFullName}
                  onChange={(e) => setPFullName(e.target.value)}
                  style={inputStyle}
                  placeholder="e.g. Lahiru Bandara"
                />
              </Field>

              <ImageUpload
                label="Player Photo"
                value={pPhotoUrl}
                onChange={setPPhotoUrl}
                folder="players"
                shape="square"
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Field label="Faculty">
                  <input
                    type="text"
                    value={pFaculty}
                    onChange={(e) => setPFaculty(e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. Faculty of Science"
                  />
                </Field>

                <Field label="Academic Year">
                  <input
                    type="text"
                    value={pAcademicYear}
                    onChange={(e) => setPAcademicYear(e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. 3rd Year"
                  />
                </Field>
              </div>

              <Field label="Player Bio (Optional)">
                <textarea
                  rows={2}
                  value={pBio}
                  onChange={(e) => setPBio(e.target.value)}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="Short bio, achievements, hockey background..."
                />
              </Field>
            </div>
          )}

          {/* SQUAD FIELDS (Jersey, Position, Captaincy) */}
          <div
            style={{
              paddingTop: '16px',
              borderTop: `1px solid ${colors.glassBorder}`,
              marginTop: '10px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
            }}
          >
            <Field label="Jersey Number (0-99)">
              <input
                type="number"
                required
                min={0}
                max={99}
                value={formJersey}
                onChange={(e) => setFormJersey(e.target.value === '' ? '' : Number(e.target.value))}
                style={inputStyle}
                placeholder="e.g. 7"
              />
            </Field>

            <Field label="Position">
              <select
                value={formPosition}
                onChange={(e) => setFormPosition(e.target.value as Position)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos} style={{ background: colors.deepNavy, color: '#fff' }}>
                    {pos}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Captain & Vice Captain Checkboxes */}
          <div style={{ display: 'flex', gap: '24px', margin: '14px 0 20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: fonts.body, fontSize: '13px', color: '#fff' }}>
              <input
                type="checkbox"
                checked={formIsCaptain}
                onChange={(e) => {
                  const val = e.target.checked
                  setFormIsCaptain(val)
                  if (val) setFormIsViceCaptain(false)
                }}
                style={{ width: '16px', height: '16px', accentColor: colors.orange }}
              />
              <span>Team Captain (C)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: fonts.body, fontSize: '13px', color: '#fff' }}>
              <input
                type="checkbox"
                checked={formIsViceCaptain}
                onChange={(e) => {
                  const val = e.target.checked
                  setFormIsViceCaptain(val)
                  if (val) setFormIsCaptain(false)
                }}
                style={{ width: '16px', height: '16px', accentColor: colors.orange }}
              />
              <span>Vice Captain (VC)</span>
            </label>
          </div>

          <FormError message={squadFormError} />

          <FormActions
            onCancel={() => setIsSquadModalOpen(false)}
            saving={savingSquad}
            submitLabel={editingMember ? 'Update Player' : 'Add to Squad'}
          />
        </form>
      </Modal>

      {/* CONFIRM DELETE SQUAD MEMBER (Admin) */}
      <Modal
        open={!!deletingMember}
        title="Remove Player from Squad"
        onClose={() => {
          setDeletingMember(null)
          setAlsoDeletePlayerPermanent(false)
        }}
        width={460}
      >
        <p style={{ color: colors.textSoft, fontSize: '14.5px', lineHeight: 1.6, marginBottom: '20px' }}>
          Are you sure you want to remove{' '}
          <strong style={{ color: '#fff' }}>{deletingMember?.players?.full_name}</strong> from the{' '}
          {selectedTournament?.name} squad?
        </p>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 14px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${colors.glassBorder}`,
            borderRadius: '12px',
            marginBottom: '24px',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#fff',
            fontFamily: fonts.body,
          }}
        >
          <input
            type="checkbox"
            checked={alsoDeletePlayerPermanent}
            onChange={(e) => setAlsoDeletePlayerPermanent(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: colors.orange }}
          />
          <span>Also delete player record permanently from master roster</span>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={() => {
              setDeletingMember(null)
              setAlsoDeletePlayerPermanent(false)
            }}
            style={{
              padding: '11px 20px',
              borderRadius: '999px',
              background: 'transparent',
              border: `1px solid ${colors.glassBorder}`,
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deletingMemberBusy}
            onClick={() => void handleDeleteSquadMember()}
            style={{
              padding: '11px 24px',
              borderRadius: '999px',
              background: colors.orange,
              border: 'none',
              color: colors.deepNavy,
              fontWeight: 700,
              cursor: deletingMemberBusy ? 'wait' : 'pointer',
              boxShadow: '0 4px 18px rgba(247,148,29,0.3)',
            }}
          >
            {deletingMemberBusy ? 'Removing…' : 'Confirm Remove'}
          </button>
        </div>
      </Modal>
    </SectionShell>
  )
}
