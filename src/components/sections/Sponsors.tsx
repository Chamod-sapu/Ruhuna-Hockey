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
import { SPONSOR_TYPES, type Sponsor } from '../../lib/types'

export default function Sponsors() {
  const { user } = useAuth()

  // 1. Data Source
  const {
    rows: allSponsors,
    loading,
    error: tableError,
    add,
    update,
    remove,
  } = useTable<Sponsor>('sponsors', { orderBy: 'created_at', ascending: false })

  // 2. Season Filter
  const [selectedSeason, setSelectedSeason] = useState<'All' | number>('All')

  // Collect distinct seasons (newest first)
  const seasons = useMemo(() => {
    const set = new Set<number>()
    for (const s of allSponsors) {
      if (s.season_year != null) set.add(s.season_year)
    }
    return Array.from(set).sort((a, b) => b - a)
  }, [allSponsors])

  // Filtered sponsors:
  // - Visitors see ONLY is_active === true
  // - Admins see both active and inactive
  // - Filter by selected season
  const visibleSponsors = useMemo(() => {
    return allSponsors.filter((s) => {
      if (!user && !s.is_active) return false
      if (selectedSeason !== 'All' && s.season_year !== selectedSeason) return false
      return true
    })
  }, [allSponsors, user, selectedSeason])

  // Group sponsors by tiers in required order:
  // 1. Title Sponsor
  // 2. Gold
  // 3. Silver
  // 4. Bronze
  // 5. Partners (Kit / Equipment / Media / Supporting)
  const titleSponsors = useMemo(
    () => visibleSponsors.filter((s) => s.sponsorship_type === 'Title Sponsor'),
    [visibleSponsors]
  )
  const goldSponsors = useMemo(
    () => visibleSponsors.filter((s) => s.sponsorship_type === 'Gold'),
    [visibleSponsors]
  )
  const silverSponsors = useMemo(
    () => visibleSponsors.filter((s) => s.sponsorship_type === 'Silver'),
    [visibleSponsors]
  )
  const bronzeSponsors = useMemo(
    () => visibleSponsors.filter((s) => s.sponsorship_type === 'Bronze'),
    [visibleSponsors]
  )
  const partnerSponsors = useMemo(
    () =>
      visibleSponsors.filter((s) =>
        ['Kit Partner', 'Equipment Partner', 'Media Partner', 'Supporting Partner'].includes(
          s.sponsorship_type
        )
      ),
    [visibleSponsors]
  )

  // 3. Detail View Modal State
  const [viewingSponsor, setViewingSponsor] = useState<Sponsor | null>(null)

  // 4. Admin Add / Edit Modal State
  const [formOpen, setFormOpen] = useState(false)
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null)
  const [formName, setFormName] = useState('')
  const [formLogoUrl, setFormLogoUrl] = useState<string | null>(null)
  const [formWebsiteUrl, setFormWebsiteUrl] = useState('')
  const [formType, setFormType] = useState<Sponsor['sponsorship_type']>('Gold')
  const [formSeasonYear, setFormSeasonYear] = useState<string>('')
  const [formDescription, setFormDescription] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [formBusy, setFormBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // 5. Admin Delete Confirm Dialog State
  const [deletingSponsor, setDeletingSponsor] = useState<Sponsor | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  // Open Add modal
  const openAddModal = () => {
    setEditingSponsor(null)
    setFormName('')
    setFormLogoUrl(null)
    setFormWebsiteUrl('')
    setFormType('Gold')
    setFormSeasonYear(new Date().getFullYear().toString())
    setFormDescription('')
    setFormIsActive(true)
    setFormError(null)
    setFormOpen(true)
  }

  // Open Edit modal
  const openEditModal = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor)
    setFormName(sponsor.name)
    setFormLogoUrl(sponsor.logo_url)
    setFormWebsiteUrl(sponsor.website_url || '')
    setFormType(sponsor.sponsorship_type)
    setFormSeasonYear(sponsor.season_year ? sponsor.season_year.toString() : '')
    setFormDescription(sponsor.description || '')
    setFormIsActive(sponsor.is_active)
    setFormError(null)
    setFormOpen(true)
  }

  // Handle Save
  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setFormBusy(true)
    setFormError(null)

    if (!formName.trim()) {
      setFormError('Sponsor name is required.')
      setFormBusy(false)
      return
    }

    // Validate website URL
    let cleanWebsiteUrl: string | null = null
    const rawUrl = formWebsiteUrl.trim()
    if (rawUrl) {
      const candidate = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
      try {
        const parsed = new URL(candidate)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          setFormError('Website URL must begin with http:// or https://')
          setFormBusy(false)
          return
        }
        cleanWebsiteUrl = parsed.href
      } catch {
        setFormError('Please enter a valid website URL (e.g. https://company.com)')
        setFormBusy(false)
        return
      }
    }

    const payload = {
      name: formName.trim(),
      logo_url: formLogoUrl,
      website_url: cleanWebsiteUrl,
      sponsorship_type: formType,
      season_year: formSeasonYear ? parseInt(formSeasonYear, 10) : null,
      description: formDescription.trim() || null,
      is_active: formIsActive,
    }

    let err: string | null = null
    if (editingSponsor) {
      err = await update(editingSponsor.id, payload)
    } else {
      err = await add(payload)
    }

    if (err) {
      setFormError(err)
      setFormBusy(false)
    } else {
      setFormBusy(false)
      setFormOpen(false)
      setEditingSponsor(null)
    }
  }

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!deletingSponsor) return
    setDeleteBusy(true)
    const err = await remove(deletingSponsor.id)
    if (!err && deletingSponsor.logo_url) {
      await deleteImageByUrl(deletingSponsor.logo_url)
    }
    setDeleteBusy(false)
    setDeletingSponsor(null)
  }

  return (
    <SectionShell
      id="sponsors"
      eyebrow="Our Partners"
      title="Sponsors"
      subtitle="We extend our deepest gratitude to our sponsors and partners whose generous backing powers the Ruhuna Hockey team on and off the field."
      addLabel="Add sponsor"
      onAdd={user ? openAddModal : undefined}
    >
      {/* Styles for logo hover transitions and responsive cards */}
      <style>{`
        .sponsor-card {
          position: relative;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px;
          cursor: pointer;
          transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
          display: flex;
          flex-direction: column;
        }
        .sponsor-card:hover {
          transform: translateY(-5px);
          border-color: rgba(247, 148, 29, 0.45);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
        }
        .sponsor-logo {
          filter: grayscale(100%);
          opacity: 0.88;
          transition: filter 0.3s ease, opacity 0.3s ease, transform 0.3s ease;
        }
        .sponsor-card:hover .sponsor-logo {
          filter: grayscale(0%);
          opacity: 1;
          transform: scale(1.03);
        }
      `}</style>

      {/* 1. SEASON FILTER PILLS */}
      {seasons.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '36px',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontFamily: fonts.body,
              color: colors.grey,
              marginRight: '6px',
              fontWeight: 600,
            }}
          >
            Season:
          </span>
          <button
            type="button"
            onClick={() => setSelectedSeason('All')}
            style={{
              padding: '6px 18px',
              borderRadius: '999px',
              background: selectedSeason === 'All' ? colors.orange : 'rgba(255,255,255,0.06)',
              color: selectedSeason === 'All' ? colors.deepNavy : colors.grey,
              fontWeight: selectedSeason === 'All' ? 700 : 500,
              fontSize: '13px',
              fontFamily: fonts.body,
              border: selectedSeason === 'All' ? 'none' : `1px solid ${colors.glassBorder}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: selectedSeason === 'All' ? '0 2px 10px rgba(247,148,29,0.3)' : 'none',
            }}
          >
            All
          </button>

          {seasons.map((year) => {
            const isSelected = selectedSeason === year
            return (
              <button
                key={year}
                type="button"
                onClick={() => setSelectedSeason(year)}
                style={{
                  padding: '6px 18px',
                  borderRadius: '999px',
                  background: isSelected ? colors.orange : 'rgba(255,255,255,0.06)',
                  color: isSelected ? colors.deepNavy : colors.grey,
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '13px',
                  fontFamily: fonts.body,
                  border: isSelected ? 'none' : `1px solid ${colors.glassBorder}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 2px 10px rgba(247,148,29,0.3)' : 'none',
                }}
              >
                {year}
              </button>
            )
          })}
        </div>
      )}

      {/* 2. TIERED SHOWCASE */}
      {tableError ? (
        <EmptyState message={`Failed to load sponsors: ${tableError}`} />
      ) : loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            style={{
              height: '240px',
              borderRadius: '24px',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${colors.glassBorder}`,
            }}
          />
        </div>
      ) : visibleSponsors.length === 0 ? (
        <EmptyState
          message={
            allSponsors.length === 0
              ? 'Sponsors will be announced soon.'
              : 'No sponsors found for the selected season.'
          }
        />
      ) : (
        <div>
          {/* TIER 1: TITLE SPONSOR */}
          {titleSponsors.length > 0 && (
            <div style={{ marginBottom: '48px' }}>
              <TierHeading title="Title Sponsor" />

              {titleSponsors.map((sponsor) => (
                <motion.div
                  key={sponsor.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => setViewingSponsor(sponsor)}
                  style={{
                    position: 'relative',
                    borderRadius: '24px',
                    background: `linear-gradient(135deg, ${colors.deepNavy}, ${colors.ink})`,
                    border: `1.5px solid rgba(247,148,29,0.5)`,
                    boxShadow:
                      '0 20px 60px rgba(0,0,0,0.65), 0 0 35px rgba(247,148,29,0.22)',
                    padding: 'clamp(24px, 4vw, 40px)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 'clamp(20px, 4vw, 36px)',
                    cursor: 'pointer',
                    opacity: sponsor.is_active ? 1 : 0.65,
                  }}
                >
                  {/* Admin RowActions */}
                  {user && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{ position: 'absolute', top: '18px', right: '18px', zIndex: 10 }}
                    >
                      <RowActions
                        onEdit={() => openEditModal(sponsor)}
                        onDelete={() => setDeletingSponsor(sponsor)}
                      />
                    </div>
                  )}

                  {/* Large Logo Tile (>= 220px wide on white rounded tile) */}
                  <div
                    style={{
                      width: 'clamp(220px, 28vw, 300px)',
                      height: '170px',
                      borderRadius: '18px',
                      background: '#ffffff',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px',
                      flexShrink: 0,
                    }}
                  >
                    {sponsor.logo_url ? (
                      <img
                        src={sponsor.logo_url}
                        alt={sponsor.name}
                        className="sponsor-logo"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontFamily: fonts.heading,
                          fontWeight: 700,
                          fontSize: '22px',
                          color: colors.deepNavy,
                          textAlign: 'center',
                        }}
                      >
                        {sponsor.name}
                      </span>
                    )}
                  </div>

                  {/* Title Sponsor Details */}
                  <div style={{ flex: 1, minWidth: 'min(100%, 280px)' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '10px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          padding: '4px 14px',
                          borderRadius: '999px',
                          background: colors.orange,
                          color: colors.deepNavy,
                          fontSize: '11.5px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          fontFamily: fonts.body,
                        }}
                      >
                        Title Sponsor
                      </span>

                      {sponsor.season_year && (
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '999px',
                            background: 'rgba(255,255,255,0.08)',
                            color: colors.grey,
                            fontSize: '12px',
                            fontWeight: 600,
                            fontFamily: fonts.body,
                            border: `1px solid ${colors.glassBorder}`,
                          }}
                        >
                          Season {sponsor.season_year}
                        </span>
                      )}

                      {!sponsor.is_active && (
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '999px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#f87171',
                            fontSize: '11px',
                            fontWeight: 700,
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                          }}
                        >
                          Inactive
                        </span>
                      )}
                    </div>

                    <h3
                      style={{
                        fontFamily: fonts.heading,
                        fontWeight: 700,
                        fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
                        color: '#ffffff',
                        margin: '0 0 10px',
                        lineHeight: 1.2,
                      }}
                    >
                      {sponsor.name}
                    </h3>

                    {sponsor.description && (
                      <p
                        style={{
                          fontFamily: fonts.body,
                          fontSize: '14.5px',
                          lineHeight: 1.6,
                          color: colors.textSoft,
                          margin: '0 0 20px',
                          maxWidth: '680px',
                        }}
                      >
                        {sponsor.description}
                      </p>
                    )}

                    {sponsor.website_url && (
                      <a
                        href={sponsor.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '10px 24px',
                          borderRadius: '999px',
                          background: colors.orange,
                          color: colors.deepNavy,
                          fontSize: '13.5px',
                          fontWeight: 700,
                          fontFamily: fonts.body,
                          textDecoration: 'none',
                          boxShadow: '0 4px 18px rgba(247,148,29,0.3)',
                        }}
                      >
                        Visit Website ↗
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* TIER 2: GOLD SPONSORS (Large cards, 2-3 per row) */}
          {goldSponsors.length > 0 && (
            <div style={{ marginBottom: '44px' }}>
              <TierHeading title="Gold Sponsors" />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
                  gap: '22px',
                }}
              >
                {goldSponsors.map((sponsor) => (
                  <SponsorCard
                    key={sponsor.id}
                    sponsor={sponsor}
                    logoHeight={125}
                    onClick={() => setViewingSponsor(sponsor)}
                    onEdit={() => openEditModal(sponsor)}
                    onDelete={() => setDeletingSponsor(sponsor)}
                    isAdmin={!!user}
                  />
                ))}
              </div>
            </div>
          )}

          {/* TIER 3: SILVER SPONSORS (Medium cards) */}
          {silverSponsors.length > 0 && (
            <div style={{ marginBottom: '40px' }}>
              <TierHeading title="Silver Sponsors" />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                  gap: '18px',
                }}
              >
                {silverSponsors.map((sponsor) => (
                  <SponsorCard
                    key={sponsor.id}
                    sponsor={sponsor}
                    logoHeight={95}
                    onClick={() => setViewingSponsor(sponsor)}
                    onEdit={() => openEditModal(sponsor)}
                    onDelete={() => setDeletingSponsor(sponsor)}
                    isAdmin={!!user}
                  />
                ))}
              </div>
            </div>
          )}

          {/* TIER 4: BRONZE SPONSORS (Smaller cards) */}
          {bronzeSponsors.length > 0 && (
            <div style={{ marginBottom: '40px' }}>
              <TierHeading title="Bronze Sponsors" />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
                  gap: '16px',
                }}
              >
                {bronzeSponsors.map((sponsor) => (
                  <SponsorCard
                    key={sponsor.id}
                    sponsor={sponsor}
                    logoHeight={80}
                    compact
                    onClick={() => setViewingSponsor(sponsor)}
                    onEdit={() => openEditModal(sponsor)}
                    onDelete={() => setDeletingSponsor(sponsor)}
                    isAdmin={!!user}
                  />
                ))}
              </div>
            </div>
          )}

          {/* TIER 5: PARTNERS (Kit / Equipment / Media / Supporting Partners) */}
          {partnerSponsors.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <TierHeading title="Official Partners & Suppliers" />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 170px), 1fr))',
                  gap: '14px',
                }}
              >
                {partnerSponsors.map((sponsor) => (
                  <SponsorCard
                    key={sponsor.id}
                    sponsor={sponsor}
                    logoHeight={75}
                    compact
                    onClick={() => setViewingSponsor(sponsor)}
                    onEdit={() => openEditModal(sponsor)}
                    onDelete={() => setDeletingSponsor(sponsor)}
                    isAdmin={!!user}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 3. BECOME A SPONSOR BANNER */}
          <div
            style={{
              marginTop: '56px',
              borderRadius: '24px',
              background: `linear-gradient(135deg, rgba(47, 52, 112, 0.45) 0%, rgba(28, 31, 74, 0.65) 100%)`,
              border: `1px solid rgba(247, 148, 29, 0.35)`,
              padding: 'clamp(26px, 4.5vw, 40px)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '24px',
              boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ maxWidth: '640px' }}>
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
                Partner With Ruhuna Hockey
              </span>
              <h3
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 'clamp(1.4rem, 2.6vw, 1.9rem)',
                  color: '#ffffff',
                  margin: '6px 0 10px',
                  fontWeight: 600,
                }}
              >
                Empower Champions. Expand Your Reach.
              </h3>
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: '14px',
                  color: colors.textSoft,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                Join hands with University of Ruhuna Hockey as an official sponsor. Empower our
                student-athletes across university championships, receive premier digital and jersey
                visibility, and inspire the next generation of sporting talent.
              </p>
            </div>
            <a
              href="#contact"
              style={{
                padding: '12px 28px',
                borderRadius: '999px',
                background: colors.orange,
                color: colors.deepNavy,
                fontFamily: fonts.body,
                fontWeight: 700,
                fontSize: '14px',
                textDecoration: 'none',
                boxShadow: '0 4px 18px rgba(247, 148, 29, 0.35)',
                whiteSpace: 'nowrap',
                transition: 'transform 0.15s ease',
              }}
            >
              Become a Sponsor →
            </a>
          </div>
        </div>
      )}

      {/* 4. DETAIL MODAL (Clicking any card) */}
      <Modal
        open={!!viewingSponsor}
        title={viewingSponsor?.name ?? 'Sponsor Details'}
        onClose={() => setViewingSponsor(null)}
        width={540}
      >
        {viewingSponsor && (
          <div>
            {/* Logo on white tile */}
            <div
              style={{
                width: '100%',
                height: '180px',
                borderRadius: '16px',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                marginBottom: '20px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              }}
            >
              {viewingSponsor.logo_url ? (
                <img
                  src={viewingSponsor.logo_url}
                  alt={viewingSponsor.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <span
                  style={{
                    fontFamily: fonts.heading,
                    fontWeight: 700,
                    fontSize: '26px',
                    color: colors.deepNavy,
                  }}
                >
                  {viewingSponsor.name}
                </span>
              )}
            </div>

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
                  padding: '3px 12px',
                  borderRadius: '999px',
                  background:
                    viewingSponsor.sponsorship_type === 'Title Sponsor'
                      ? colors.orange
                      : 'rgba(247, 148, 29, 0.2)',
                  color:
                    viewingSponsor.sponsorship_type === 'Title Sponsor'
                      ? colors.deepNavy
                      : colors.orange,
                  border: `1px solid rgba(247, 148, 29, 0.5)`,
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                }}
              >
                {viewingSponsor.sponsorship_type}
              </span>

              {viewingSponsor.season_year && (
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '999px',
                    background: 'rgba(255,255,255,0.06)',
                    color: colors.grey,
                    fontSize: '11.5px',
                    fontWeight: 600,
                  }}
                >
                  Season {viewingSponsor.season_year}
                </span>
              )}

              {!viewingSponsor.is_active && (
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '999px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                  }}
                >
                  Inactive
                </span>
              )}
            </div>

            <h3
              style={{
                fontFamily: fonts.heading,
                fontSize: '22px',
                fontWeight: 600,
                color: '#fff',
                margin: '0 0 12px',
              }}
            >
              {viewingSponsor.name}
            </h3>

            {viewingSponsor.description && (
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: '14px',
                  lineHeight: 1.65,
                  color: 'rgba(255,255,255,0.85)',
                  marginBottom: '20px',
                }}
              >
                {viewingSponsor.description}
              </p>
            )}

            {/* Visit Website link */}
            {viewingSponsor.website_url && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <a
                  href={viewingSponsor.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '10px 24px',
                    borderRadius: '999px',
                    background: colors.orange,
                    color: colors.deepNavy,
                    fontSize: '13.5px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontFamily: fonts.body,
                    boxShadow: '0 4px 14px rgba(247, 148, 29, 0.3)',
                  }}
                >
                  Visit Website ↗
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 5. ADMIN ADD / EDIT MODAL */}
      <Modal
        open={formOpen}
        title={editingSponsor ? 'Edit Sponsor' : 'Add Sponsor'}
        onClose={() => setFormOpen(false)}
        width={560}
      >
        <form onSubmit={handleSave}>
          <Field label="Sponsor / Partner Name">
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              style={inputStyle}
              placeholder="e.g. Dialog Axiata, Singer Sri Lanka"
            />
          </Field>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
            }}
          >
            <Field label="Sponsorship Type">
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as Sponsor['sponsorship_type'])}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {SPONSOR_TYPES.map((t) => (
                  <option key={t} value={t} style={{ background: colors.deepNavy }}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Season Year (Optional)">
              <input
                type="number"
                min={2000}
                max={2099}
                value={formSeasonYear}
                onChange={(e) => setFormSeasonYear(e.target.value)}
                style={inputStyle}
                placeholder="e.g. 2026"
              />
            </Field>
          </div>

          <Field label="Website URL (Optional)" hint="Link to company website (with http/https)">
            <input
              type="text"
              value={formWebsiteUrl}
              onChange={(e) => setFormWebsiteUrl(e.target.value)}
              style={inputStyle}
              placeholder="https://example.com"
            />
          </Field>

          <Field label="Description (Optional)">
            <textarea
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Sponsor partnership highlights, message, provided equipment or services..."
            />
          </Field>

          <div>
            <ImageUpload
              label="Sponsor Logo"
              value={formLogoUrl}
              onChange={setFormLogoUrl}
              folder="sponsors"
              shape="wide"
            />
            <span
              style={{
                display: 'block',
                fontSize: '11.5px',
                color: colors.textSoft,
                marginTop: '-8px',
                marginBottom: '14px',
              }}
            >
              PNG with transparent background works best.
            </span>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                color: '#fff',
                fontSize: '13.5px',
                fontFamily: fonts.body,
              }}
            >
              <input
                type="checkbox"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: colors.orange }}
              />
              Active sponsor (uncheck to hide from public visitors)
            </label>
          </div>

          <FormError message={formError} />

          <FormActions
            onCancel={() => setFormOpen(false)}
            saving={formBusy}
            submitLabel={editingSponsor ? 'Update Sponsor' : 'Add Sponsor'}
          />
        </form>
      </Modal>

      {/* 6. ADMIN CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        open={!!deletingSponsor}
        message={`Are you sure you want to delete the sponsor "${deletingSponsor?.name}"? This action cannot be undone.`}
        busy={deleteBusy}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeletingSponsor(null)}
      />
    </SectionShell>
  )
}

// Subcomponent: Tier Heading with Gradient Divider
function TierHeading({ title }: { title: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        margin: '36px 0 20px',
      }}
    >
      <span
        style={{
          fontFamily: fonts.body,
          fontSize: '12px',
          fontWeight: 800,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: colors.orange,
          flexShrink: 0,
        }}
      >
        {title}
      </span>
      <div
        style={{
          flex: 1,
          height: '1px',
          background: 'linear-gradient(90deg, rgba(247,148,29,0.4) 0%, rgba(255,255,255,0.06) 100%)',
        }}
      />
    </div>
  )
}

// Subcomponent: Individual Tier Sponsor Card
interface SponsorCardProps {
  sponsor: Sponsor
  logoHeight: number
  compact?: boolean
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
  isAdmin: boolean
}

function SponsorCard({
  sponsor,
  logoHeight,
  compact = false,
  onClick,
  onEdit,
  onDelete,
  isAdmin,
}: SponsorCardProps) {
  return (
    <div
      className="sponsor-card"
      onClick={onClick}
      style={{
        opacity: sponsor.is_active ? 1 : 0.65,
      }}
    >
      {/* Admin RowActions */}
      {isAdmin && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}
        >
          <RowActions onEdit={onEdit} onDelete={onDelete} />
        </div>
      )}

      {/* White rounded logo tile */}
      <div
        style={{
          width: '100%',
          height: `${logoHeight}px`,
          borderRadius: '14px',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px',
          marginBottom: '14px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}
      >
        {sponsor.logo_url ? (
          <img
            src={sponsor.logo_url}
            alt={sponsor.name}
            className="sponsor-logo"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        ) : (
          <span
            style={{
              fontFamily: fonts.heading,
              fontWeight: 700,
              fontSize: compact ? '15px' : '18px',
              color: colors.deepNavy,
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            {sponsor.name}
          </span>
        )}
      </div>

      {/* Card Info */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: 1,
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '6px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'rgba(247, 148, 29, 0.2)',
                border: `1px solid rgba(247, 148, 29, 0.4)`,
                color: colors.orange,
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontFamily: fonts.body,
              }}
            >
              {sponsor.sponsorship_type}
            </span>

            {sponsor.season_year && !compact && (
              <span style={{ fontSize: '11px', color: colors.grey, fontFamily: fonts.body }}>
                '{sponsor.season_year.toString().slice(-2)}
              </span>
            )}

            {!sponsor.is_active && (
              <span
                style={{
                  padding: '2px 7px',
                  borderRadius: '999px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  fontSize: '10px',
                  fontWeight: 700,
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                }}
              >
                Inactive
              </span>
            )}
          </div>

          <h4
            style={{
              fontFamily: fonts.heading,
              fontWeight: 600,
              fontSize: compact ? '14px' : '16px',
              color: '#ffffff',
              margin: '0 0 6px',
              lineHeight: 1.3,
            }}
          >
            {sponsor.name}
          </h4>

          {sponsor.description && !compact && (
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: '12.5px',
                color: colors.textSoft,
                lineHeight: 1.5,
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {sponsor.description}
            </p>
          )}
        </div>

        {sponsor.website_url && !compact && (
          <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: `1px solid ${colors.glassBorder}` }}>
            <span style={{ fontSize: '11.5px', color: colors.orange, fontFamily: fonts.body }}>
              Website ↗
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
