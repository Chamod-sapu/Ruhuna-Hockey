import { useState, useMemo, useEffect, useRef, useCallback, type FormEvent, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SectionShell from '../ui/SectionShell'
import Modal from '../ui/Modal'
import { Field, FormError, FormActions, inputStyle } from '../ui/FormFields'
import ImageUpload from '../ui/ImageUpload'
import ConfirmDialog from '../ui/ConfirmDialog'
import RowActions from '../ui/RowActions'
import EmptyState from '../ui/EmptyState'
import { useTable } from '../../hooks/useTable'
import { supabase } from '../../lib/supabase'
import { uploadImage, deleteImageByUrl } from '../../lib/storage'
import { colors, fonts } from '../../lib/theme'
import { useAuth } from '../../context/AuthContext'
import { fmtDate } from '../../lib/format'
import { GALLERY_CATEGORIES, type GalleryItem } from '../../lib/types'

interface PendingPhoto {
  id: string
  file: File
  previewUrl: string
  title: string
  caption: string
  status: 'idle' | 'uploading' | 'success' | 'error'
  errorMessage?: string
  uploadedUrl?: string
}

function fmtPhotoDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  try {
    return fmtDate(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00+05:30`)
  } catch {
    return dateStr
  }
}

export default function Gallery() {
  const { user } = useAuth()

  // 1. Database Table
  const {
    rows: items,
    loading,
    error: tableError,
    reload,
    update,
    remove,
  } = useTable<GalleryItem>('gallery_items', { orderBy: 'created_at', ascending: false })

  // 2. Filter & Display State
  const [selectedCategory, setSelectedCategory] = useState<'All' | GalleryItem['category']>('All')
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [visibleCount, setVisibleCount] = useState(24)

  // 3. Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const lastFocusedTileIdRef = useRef<string | null>(null)

  // 4. Admin Bulk Mode State
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkCategory, setBulkCategory] = useState<GalleryItem['category']>('Matches')
  const [bulkCategoryBusy, setBulkCategoryBusy] = useState(false)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [bulkDeleteBusy, setBulkDeleteBusy] = useState(false)

  // 5. Admin Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
  const [sharedCategory, setSharedCategory] = useState<GalleryItem['category']>('Matches')
  const [sharedTakenOn, setSharedTakenOn] = useState<string>('')
  const [sharedFeatured, setSharedFeatured] = useState<boolean>(false)
  const [uploadingProgress, setUploadingProgress] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 6. Admin Single Edit Modal State
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCaption, setEditCaption] = useState('')
  const [editCategory, setEditCategory] = useState<GalleryItem['category']>('Matches')
  const [editTakenOn, setEditTakenOn] = useState('')
  const [editFeatured, setEditFeatured] = useState(false)
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null)
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // 7. Admin Delete Confirm Dialog State
  const [deletingItem, setDeletingItem] = useState<GalleryItem | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  // Sort photos newest first (by taken_on or created_at)
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const timeA = a.taken_on ? new Date(a.taken_on).getTime() : new Date(a.created_at).getTime()
      const timeB = b.taken_on ? new Date(b.taken_on).getTime() : new Date(b.created_at).getTime()
      return timeB - timeA
    })
  }, [items])

  // Counts for category chips and featured toggle
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: sortedItems.length }
    for (const cat of GALLERY_CATEGORIES) {
      counts[cat] = sortedItems.filter((i) => i.category === cat).length
    }
    return counts
  }, [sortedItems])

  const featuredCount = useMemo(() => {
    return sortedItems.filter((i) => i.is_featured).length
  }, [sortedItems])

  // Filtered photo list
  const filteredItems = useMemo(() => {
    return sortedItems.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false
      if (featuredOnly && !item.is_featured) return false
      return true
    })
  }, [sortedItems, selectedCategory, featuredOnly])

  // Paginated visible slice
  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, visibleCount)
  }, [filteredItems, visibleCount])

  // Current photo for lightbox
  const currentLightboxItem =
    lightboxIndex !== null && filteredItems[lightboxIndex] ? filteredItems[lightboxIndex] : null

  // Preload neighbouring lightbox images for instant switching
  useEffect(() => {
    if (lightboxIndex === null || filteredItems.length === 0) return
    const prevIdx = (lightboxIndex - 1 + filteredItems.length) % filteredItems.length
    const nextIdx = (lightboxIndex + 1) % filteredItems.length

    const imgPrev = new Image()
    imgPrev.src = filteredItems[prevIdx].image_url
    const imgNext = new Image()
    imgNext.src = filteredItems[nextIdx].image_url
  }, [lightboxIndex, filteredItems])

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null)
    if (lastFocusedTileIdRef.current) {
      const el = document.getElementById(`gallery-tile-${lastFocusedTileIdRef.current}`)
      el?.focus()
    }
  }, [])

  const openLightbox = (index: number, itemId: string) => {
    lastFocusedTileIdRef.current = itemId
    setLightboxIndex(index)
  }

  const handlePrevPhoto = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev - 1 + filteredItems.length) % filteredItems.length : 0
    )
  }, [filteredItems.length])

  const handleNextPhoto = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev + 1) % filteredItems.length : 0))
  }, [filteredItems.length])

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (lightboxIndex === null) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrevPhoto()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNextPhoto()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [lightboxIndex, closeLightbox, handlePrevPhoto, handleNextPhoto])

  // --- Admin Bulk Mode Handlers ---
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(filteredItems.map((i) => i.id)))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  const handleBulkChangeCategory = async () => {
    if (selectedIds.size === 0) return
    setBulkCategoryBusy(true)
    const ids = Array.from(selectedIds)
    const { error: err } = await supabase
      .from('gallery_items')
      .update({ category: bulkCategory })
      .in('id', ids)

    if (!err) {
      await reload()
      setSelectedIds(new Set())
    }
    setBulkCategoryBusy(false)
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setBulkDeleteBusy(true)
    const ids = Array.from(selectedIds)
    const itemsToDelete = items.filter((i) => selectedIds.has(i.id))

    const { error: err } = await supabase.from('gallery_items').delete().in('id', ids)

    if (!err) {
      // Clean up files in storage
      for (const item of itemsToDelete) {
        if (item.image_url) {
          await deleteImageByUrl(item.image_url)
        }
      }
      await reload()
      setSelectedIds(new Set())
      setBulkDeleteConfirmOpen(false)
    }
    setBulkDeleteBusy(false)
  }

  // --- Admin Multiple Photo Upload Handlers ---
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const MAX_GALLERY_SIZE = 10 * 1024 * 1024
    const newPhotos: PendingPhoto[] = []
    let rejectedCount = 0
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) {
        rejectedCount++
        continue
      }
      if (file.size > MAX_GALLERY_SIZE) {
        setUploadError(`File "${file.name}" exceeds 10 MB limit and was skipped.`)
        continue
      }
      newPhotos.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        title: '',
        caption: '',
        status: 'idle',
      })
    }
    if (rejectedCount > 0) {
      setUploadError('Non-image files were skipped. Only images (JPG, PNG, WebP) are allowed.')
    }
    setPendingPhotos((prev) => [...prev, ...newPhotos])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removePendingPhoto = (id: string) => {
    setPendingPhotos((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((p) => p.id !== id)
    })
  }

  const handleUploadSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    setUploadError(null)

    const unuploaded = pendingPhotos.filter((p) => p.status !== 'success')
    if (unuploaded.length === 0) {
      setUploadError('Please choose at least one photo to upload.')
      return
    }

    const total = unuploaded.length
    let completedCount = 0
    let anyError = false

    // Process 3 concurrent uploads at a time
    const batchSize = 3
    for (let i = 0; i < unuploaded.length; i += batchSize) {
      const batch = unuploaded.slice(i, i + batchSize)

      await Promise.all(
        batch.map(async (photo) => {
          setPendingPhotos((prev) =>
            prev.map((p) => (p.id === photo.id ? { ...p, status: 'uploading' } : p))
          )
          setUploadingProgress(`Uploading ${completedCount + 1} of ${total}…`)

          try {
            // Compress & upload image
            const publicUrl = await uploadImage(photo.file, 'gallery')

            // Insert row into gallery_items
            const { error: insertErr } = await supabase.from('gallery_items').insert({
              title: photo.title.trim() || null,
              caption: photo.caption.trim() || null,
              image_url: publicUrl,
              category: sharedCategory,
              taken_on: sharedTakenOn || null,
              is_featured: sharedFeatured,
            })

            if (insertErr) throw insertErr

            completedCount++
            setPendingPhotos((prev) =>
              prev.map((p) =>
                p.id === photo.id ? { ...p, status: 'success', uploadedUrl: publicUrl } : p
              )
            )
          } catch (err) {
            anyError = true
            const msg = err instanceof Error ? err.message : 'Upload failed'
            setPendingPhotos((prev) =>
              prev.map((p) =>
                p.id === photo.id ? { ...p, status: 'error', errorMessage: msg } : p
              )
            )
          }
        })
      )
    }

    setUploadingProgress(null)
    await reload()

    if (!anyError) {
      // All succeeded: clean up preview blobs and close modal
      pendingPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
      setPendingPhotos([])
      setUploadModalOpen(false)
    } else {
      setUploadError('Some photos failed to upload. Check errors below and click "Retry failed".')
      // Remove successfully uploaded photos from the queue
      setPendingPhotos((prev) => {
        prev.filter((p) => p.status === 'success').forEach((p) => URL.revokeObjectURL(p.previewUrl))
        return prev.filter((p) => p.status !== 'success')
      })
    }
  }

  // --- Admin Single Edit Handlers ---
  const openEditModal = (item: GalleryItem) => {
    setEditingItem(item)
    setEditTitle(item.title || '')
    setEditCaption(item.caption || '')
    setEditCategory(item.category)
    setEditTakenOn(item.taken_on || '')
    setEditFeatured(item.is_featured)
    setEditImageUrl(item.image_url)
    setEditError(null)
  }

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    if (!editImageUrl) {
      setEditError('An image is required.')
      return
    }

    setEditBusy(true)
    setEditError(null)

    const payload = {
      title: editTitle.trim() || null,
      caption: editCaption.trim() || null,
      category: editCategory,
      taken_on: editTakenOn || null,
      is_featured: editFeatured,
      image_url: editImageUrl,
    }

    const err = await update(editingItem.id, payload)
    if (err) {
      setEditError(err)
      setEditBusy(false)
    } else {
      // If image replaced, remove old image
      if (editImageUrl !== editingItem.image_url) {
        await deleteImageByUrl(editingItem.image_url)
      }
      setEditBusy(false)
      setEditingItem(null)
    }
  }

  // --- Admin Single Delete Handlers ---
  const handleConfirmDelete = async () => {
    if (!deletingItem) return
    setDeleteBusy(true)
    const err = await remove(deletingItem.id)
    if (!err && deletingItem.image_url) {
      await deleteImageByUrl(deletingItem.image_url)
    }
    setDeleteBusy(false)
    setDeletingItem(null)
  }

  return (
    <SectionShell
      id="gallery"
      alt
      eyebrow="Moments"
      title="Gallery"
      addLabel="Upload photos"
      onAdd={
        user
          ? () => {
              setUploadError(null)
              setPendingPhotos([])
              setUploadModalOpen(true)
            }
          : undefined
      }
    >
      {/* Embedded CSS for multi-column masonry & keyframe animations */}
      <style>{`
        .gallery-masonry {
          column-count: 4;
          column-gap: 14px;
        }
        @media (max-width: 1200px) {
          .gallery-masonry { column-count: 3; }
        }
        @media (max-width: 900px) {
          .gallery-masonry { column-count: 2; }
        }
        @media (max-width: 560px) {
          .gallery-masonry { column-count: 1; }
        }
        .gallery-tile {
          break-inside: avoid;
          margin-bottom: 14px;
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
          transform: translateZ(0);
        }
        .gallery-tile:hover .gallery-img {
          transform: scale(1.05);
        }
        .gallery-tile:hover .gallery-overlay {
          opacity: 1;
        }
        .gallery-tile:hover .gallery-admin-bar {
          opacity: 1 !important;
        }
        @media (hover: none) {
          .gallery-admin-bar {
            opacity: 1 !important;
          }
        }
        @keyframes shimmerGlow {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-placeholder {
          background: linear-gradient(90deg, rgba(28, 31, 74, 0.5) 0%, rgba(47, 52, 112, 0.5) 50%, rgba(28, 31, 74, 0.5) 100%);
          background-size: 200% 100%;
          animation: shimmerGlow 1.8s infinite;
        }
      `}</style>

      {/* 1. FILTER CONTROLS & ADMIN ACTIONS ROW */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        {/* Category Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {(['All', ...GALLERY_CATEGORIES] as const).map((cat) => {
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
                  fontSize: '13px',
                  fontFamily: fonts.body,
                  border: isSelected ? 'none' : `1px solid ${colors.glassBorder}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isSelected ? '0 3px 12px rgba(247,148,29,0.3)' : 'none',
                }}
              >
                {cat} <span style={{ opacity: isSelected ? 0.9 : 0.65 }}>({count})</span>
              </button>
            )
          })}
        </div>

        {/* Featured Only Toggle + Admin Bulk Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setFeaturedOnly(!featuredOnly)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 16px',
              borderRadius: '999px',
              background: featuredOnly ? 'rgba(247, 148, 29, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              border: `1px solid ${featuredOnly ? colors.orange : colors.glassBorder}`,
              color: featuredOnly ? colors.orange : colors.grey,
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: fonts.body,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ color: colors.orange, fontSize: '14px' }}>★</span>
            <span>Featured only</span>
            <span style={{ opacity: 0.7 }}>({featuredCount})</span>
          </button>

          {/* Admin "Select" Bulk Toggle */}
          {user && (
            <button
              type="button"
              onClick={() => {
                setBulkMode(!bulkMode)
                setSelectedIds(new Set())
              }}
              style={{
                padding: '7px 16px',
                borderRadius: '999px',
                background: bulkMode ? colors.deepNavy : 'rgba(255, 255, 255, 0.08)',
                border: `1px solid ${bulkMode ? colors.orange : colors.glassBorder}`,
                color: bulkMode ? colors.orange : '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: fonts.body,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {bulkMode ? '✕ Cancel Select' : '✓ Select'}
            </button>
          )}
        </div>
      </div>

      {/* 2. BULK ACTIONS TOOLBAR (Only shown when Bulk Mode is active) */}
      <AnimatePresence>
        {user && bulkMode && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            style={{
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${colors.deepNavy}, ${colors.ink})`,
              border: `1px solid rgba(247, 148, 29, 0.4)`,
              padding: '14px 20px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#fff', fontFamily: fonts.body }}>
                {selectedIds.size} of {filteredItems.length} selected
              </span>
              <button
                type="button"
                onClick={selectAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.orange,
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Select All
              </button>
              <button
                type="button"
                onClick={deselectAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.textSoft,
                  cursor: 'pointer',
                  fontSize: '13px',
                  padding: 0,
                }}
              >
                Clear
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12.5px', color: colors.grey }}>Move to:</span>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value as GalleryItem['category'])}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.08)',
                    border: `1px solid ${colors.glassBorder}`,
                    color: '#fff',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                  }}
                >
                  {GALLERY_CATEGORIES.map((c) => (
                    <option key={c} value={c} style={{ background: colors.deepNavy }}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={selectedIds.size === 0 || bulkCategoryBusy}
                  onClick={() => void handleBulkChangeCategory()}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    background: colors.orange,
                    border: 'none',
                    color: colors.deepNavy,
                    fontWeight: 700,
                    fontSize: '12.5px',
                    cursor: selectedIds.size === 0 || bulkCategoryBusy ? 'not-allowed' : 'pointer',
                    opacity: selectedIds.size === 0 || bulkCategoryBusy ? 0.6 : 1,
                  }}
                >
                  {bulkCategoryBusy ? 'Updating…' : 'Apply'}
                </button>
              </div>

              <button
                type="button"
                disabled={selectedIds.size === 0 || bulkDeleteBusy}
                onClick={() => setBulkDeleteConfirmOpen(true)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '8px',
                  background: 'rgba(220, 38, 38, 0.2)',
                  border: '1px solid rgba(220, 38, 38, 0.5)',
                  color: '#f87171',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer',
                  opacity: selectedIds.size === 0 ? 0.6 : 1,
                }}
              >
                Delete Selected ({selectedIds.size})
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. MASONRY GRID OR EMPTY STATES */}
      {tableError ? (
        <EmptyState message={`Failed to load gallery: ${tableError}`} />
      ) : loading ? (
        <div className="gallery-masonry">
          {[180, 240, 160, 280, 210, 190, 250, 170].map((h, i) => (
            <div
              key={i}
              className="gallery-tile shimmer-placeholder"
              style={{ height: `${h}px`, marginBottom: '14px' }}
            />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          message={
            items.length === 0
              ? 'No photos yet.'
              : featuredOnly
                ? 'No featured photos found in this category.'
                : `No photos found in "${selectedCategory}".`
          }
        />
      ) : (
        <div>
          <div className="gallery-masonry">
            {displayedItems.map((item, index) => {
              const isSelected = selectedIds.has(item.id)
              return (
                <GalleryTile
                  key={item.id}
                  item={item}
                  index={index}
                  isBulkMode={bulkMode}
                  isSelected={isSelected}
                  onToggleSelect={() => toggleSelect(item.id)}
                  onClick={() => openLightbox(index, item.id)}
                  onEdit={() => openEditModal(item)}
                  onDelete={() => setDeletingItem(item)}
                  isAdmin={!!user}
                />
              )
            })}
          </div>

          {/* 4. LOAD MORE BUTTON */}
          {visibleCount < filteredItems.length && (
            <div style={{ textAlign: 'center', marginTop: '48px' }}>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 24)}
                style={{
                  padding: '13px 36px',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: `1px solid ${colors.glassBorder}`,
                  color: '#ffffff',
                  fontSize: '14.5px',
                  fontWeight: 600,
                  fontFamily: fonts.body,
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  transition: 'background 0.2s',
                }}
              >
                Load More Moments ({filteredItems.length - visibleCount} remaining)
              </motion.button>
            </div>
          )}
        </div>
      )}

      {/* 5. FULL-SCREEN LIGHTBOX */}
      <AnimatePresence>
        {currentLightboxItem && lightboxIndex !== null && (
          <motion.div
            key="lightbox-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeLightbox}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'rgba(5, 6, 20, 0.95)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'clamp(16px, 3vw, 36px)',
            }}
          >
            {/* Top Toolbar: Counter & Close button */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: '20px',
                left: '24px',
                right: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 1010,
              }}
            >
              <div
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: `1px solid ${colors.glassBorder}`,
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  fontFamily: fonts.body,
                }}
              >
                {lightboxIndex + 1} / {filteredItems.length}
              </div>

              <button
                type="button"
                onClick={closeLightbox}
                aria-label="Close Lightbox"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: `1px solid ${colors.glassBorder}`,
                  color: '#ffffff',
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                ✕
              </button>
            </div>

            {/* Left Nav Button */}
            {filteredItems.length > 1 && (
              <button
                type="button"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation()
                  handlePrevPhoto()
                }}
                style={{
                  position: 'absolute',
                  left: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 1010,
                  width: '48px',
                  height: '48px',
                  borderRadius: '999px',
                  background: 'rgba(11, 13, 38, 0.8)',
                  border: `1px solid ${colors.glassBorder}`,
                  color: '#ffffff',
                  fontSize: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
                }}
              >
                ‹
              </button>
            )}

            {/* Right Nav Button */}
            {filteredItems.length > 1 && (
              <button
                type="button"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation()
                  handleNextPhoto()
                }}
                style={{
                  position: 'absolute',
                  right: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 1010,
                  width: '48px',
                  height: '48px',
                  borderRadius: '999px',
                  background: 'rgba(11, 13, 38, 0.8)',
                  border: `1px solid ${colors.glassBorder}`,
                  color: '#ffffff',
                  fontSize: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
                }}
              >
                ›
              </button>
            )}

            {/* Lightbox Center Content with Touch Swipe Support */}
            <motion.div
              key={currentLightboxItem.id}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.4}
              onDragEnd={(_, info) => {
                if (info.offset.x > 70 || info.velocity.x > 350) {
                  handlePrevPhoto()
                } else if (info.offset.x < -70 || info.velocity.x < -350) {
                  handleNextPhoto()
                }
              }}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                maxWidth: '90vw',
                maxHeight: '84vh',
                cursor: 'grab',
                touchAction: 'none',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  maxHeight: '70vh',
                  maxWidth: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={currentLightboxItem.image_url}
                  alt={currentLightboxItem.title || currentLightboxItem.caption || 'Ruhuna Hockey'}
                  style={{
                    maxHeight: '70vh',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    borderRadius: '14px',
                    boxShadow: '0 25px 70px rgba(0,0,0,0.85)',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                />

                {currentLightboxItem.is_featured && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '14px',
                      right: '14px',
                      background: 'rgba(11, 13, 38, 0.85)',
                      border: `1px solid rgba(247, 148, 29, 0.5)`,
                      borderRadius: '999px',
                      padding: '4px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    <span style={{ color: colors.orange, fontSize: '13px' }}>★</span>
                    <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>Featured</span>
                  </div>
                )}
              </div>

              {/* Title, Caption, Date, Category Below Image */}
              <div
                style={{
                  marginTop: '16px',
                  textAlign: 'center',
                  maxWidth: '680px',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    marginBottom: '6px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '999px',
                      background: 'rgba(247, 148, 29, 0.2)',
                      border: `1px solid rgba(247, 148, 29, 0.5)`,
                      color: colors.orange,
                      fontSize: '11.5px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      fontFamily: fonts.body,
                    }}
                  >
                    {currentLightboxItem.category}
                  </span>

                  {currentLightboxItem.taken_on && (
                    <span style={{ color: colors.grey, fontSize: '12.5px', fontFamily: fonts.body }}>
                      📅 {fmtPhotoDate(currentLightboxItem.taken_on)}
                    </span>
                  )}
                </div>

                {currentLightboxItem.title && (
                  <h3
                    style={{
                      fontFamily: fonts.heading,
                      fontSize: '19px',
                      fontWeight: 600,
                      color: '#ffffff',
                      margin: '0 0 4px',
                    }}
                  >
                    {currentLightboxItem.title}
                  </h3>
                )}

                {currentLightboxItem.caption && (
                  <p
                    style={{
                      fontFamily: fonts.body,
                      fontSize: '13.5px',
                      lineHeight: 1.5,
                      color: colors.textSoft,
                      margin: 0,
                    }}
                  >
                    {currentLightboxItem.caption}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. ADMIN MULTIPLE PHOTO UPLOAD MODAL */}
      <Modal
        open={uploadModalOpen}
        title="Upload Photos to Gallery"
        onClose={() => {
          if (!uploadingProgress) {
            pendingPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
            setPendingPhotos([])
            setUploadModalOpen(false)
          }
        }}
        width={700}
      >
        <form onSubmit={handleUploadSubmit}>
          {/* Drag & Drop File Picker Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleFilesSelected(e.dataTransfer.files)
            }}
            style={{
              padding: '36px 20px',
              borderRadius: '16px',
              border: `2px dashed ${colors.glassBorder}`,
              background: 'rgba(255, 255, 255, 0.03)',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: '20px',
              transition: 'border-color 0.2s',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleFilesSelected(e.target.files)}
            />
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.orange}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ margin: '0 auto 12px' }}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p
              style={{
                fontFamily: fonts.heading,
                fontSize: '15px',
                fontWeight: 600,
                color: '#fff',
                margin: '0 0 4px',
              }}
            >
              Click or drag & drop multiple photos here
            </p>
            <p style={{ fontFamily: fonts.body, fontSize: '12.5px', color: colors.textSoft, margin: 0 }}>
              Supports JPG, PNG, WebP. Automatically compressed before upload.
            </p>
          </div>

          {/* Shared Options */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
              marginBottom: '16px',
              background: 'rgba(255,255,255,0.03)',
              padding: '16px',
              borderRadius: '14px',
              border: `1px solid ${colors.glassBorder}`,
            }}
          >
            <Field label="Category for all">
              <select
                value={sharedCategory}
                onChange={(e) => setSharedCategory(e.target.value as GalleryItem['category'])}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {GALLERY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} style={{ background: colors.deepNavy }}>
                    {cat}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Taken on date (optional)">
              <input
                type="date"
                value={sharedTakenOn}
                onChange={(e) => setSharedTakenOn(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: '14px' }}>
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
                  checked={sharedFeatured}
                  onChange={(e) => setSharedFeatured(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: colors.orange }}
                />
                Mark as Featured
              </label>
            </div>
          </div>

          {/* Preview Grid for Selected Photos */}
          {pendingPhotos.length > 0 && (
            <div style={{ marginBottom: '18px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600, color: colors.grey }}>
                  Selected photos ({pendingPhotos.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    pendingPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
                    setPendingPhotos([])
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.orange,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Clear all
                </button>
              </div>

              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  paddingRight: '6px',
                }}
              >
                {pendingPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: 'rgba(255,255,255,0.04)',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      border: `1px solid ${
                        photo.status === 'error'
                          ? 'rgba(239, 68, 68, 0.5)'
                          : photo.status === 'success'
                            ? 'rgba(34, 197, 94, 0.5)'
                            : colors.glassBorder
                      }`,
                    }}
                  >
                    <img
                      src={photo.previewUrl}
                      alt=""
                      style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        flexShrink: 0,
                      }}
                    />

                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <input
                        type="text"
                        placeholder="Optional title"
                        value={photo.title}
                        onChange={(e) => {
                          const val = e.target.value
                          setPendingPhotos((prev) =>
                            prev.map((p) => (p.id === photo.id ? { ...p, title: val } : p))
                          )
                        }}
                        style={{
                          ...inputStyle,
                          padding: '5px 8px',
                          fontSize: '12px',
                          borderRadius: '6px',
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Optional caption"
                        value={photo.caption}
                        onChange={(e) => {
                          const val = e.target.value
                          setPendingPhotos((prev) =>
                            prev.map((p) => (p.id === photo.id ? { ...p, caption: val } : p))
                          )
                        }}
                        style={{
                          ...inputStyle,
                          padding: '5px 8px',
                          fontSize: '12px',
                          borderRadius: '6px',
                        }}
                      />

                      {photo.status === 'error' && (
                        <span style={{ fontSize: '11px', color: '#f87171' }}>
                          Error: {photo.errorMessage}
                        </span>
                      )}
                    </div>

                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {photo.status === 'uploading' ? (
                        <span style={{ fontSize: '11.5px', color: colors.orange }}>Uploading…</span>
                      ) : photo.status === 'success' ? (
                        <span style={{ fontSize: '16px', color: '#4ade80' }}>✓</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removePendingPhoto(photo.id)}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '999px',
                            background: 'rgba(255,255,255,0.08)',
                            border: 'none',
                            color: '#fff',
                            fontSize: '14px',
                            cursor: 'pointer',
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress Bar */}
          {uploadingProgress && (
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12.5px',
                  color: colors.orange,
                  fontWeight: 600,
                  marginBottom: '6px',
                }}
              >
                <span>{uploadingProgress}</span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                  style={{
                    width: '60%',
                    height: '100%',
                    background: colors.orange,
                    borderRadius: '999px',
                  }}
                />
              </div>
            </div>
          )}

          <FormError message={uploadError} />

          <FormActions
            onCancel={() => {
              pendingPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
              setPendingPhotos([])
              setUploadModalOpen(false)
            }}
            saving={!!uploadingProgress}
            submitLabel={
              pendingPhotos.some((p) => p.status === 'error')
                ? 'Retry Failed Uploads'
                : `Upload ${pendingPhotos.length} Photo${pendingPhotos.length === 1 ? '' : 's'}`
            }
          />
        </form>
      </Modal>

      {/* 7. ADMIN SINGLE PHOTO EDIT MODAL */}
      <Modal
        open={!!editingItem}
        title="Edit Photo"
        onClose={() => setEditingItem(null)}
        width={540}
      >
        <form onSubmit={handleSaveEdit}>
          <Field label="Title (optional)">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              style={inputStyle}
              placeholder="e.g. Finals Victory Celebration"
            />
          </Field>

          <Field label="Caption (optional)">
            <textarea
              rows={2}
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Moment details, players in photo, etc."
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Category">
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as GalleryItem['category'])}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {GALLERY_CATEGORIES.map((c) => (
                  <option key={c} value={c} style={{ background: colors.deepNavy }}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Taken on date">
              <input
                type="date"
                value={editTakenOn}
                onChange={(e) => setEditTakenOn(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={{ marginBottom: '16px' }}>
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
                checked={editFeatured}
                onChange={(e) => setEditFeatured(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: colors.orange }}
              />
              Mark as Featured photo
            </label>
          </div>

          <ImageUpload
            label="Replace Photo"
            value={editImageUrl}
            onChange={setEditImageUrl}
            folder="gallery"
            shape="wide"
          />

          <FormError message={editError} />

          <FormActions
            onCancel={() => setEditingItem(null)}
            saving={editBusy}
            submitLabel="Save Changes"
          />
        </form>
      </Modal>

      {/* 8. SINGLE DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        open={!!deletingItem}
        message="Are you sure you want to delete this photo from the gallery? This action cannot be undone."
        busy={deleteBusy}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeletingItem(null)}
      />

      {/* 9. BULK DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        message={`Are you sure you want to delete ${selectedIds.size} selected photos? This will permanently remove them from the database and storage.`}
        busy={bulkDeleteBusy}
        onConfirm={() => void handleBulkDelete()}
        onCancel={() => setBulkDeleteConfirmOpen(false)}
      />
    </SectionShell>
  )
}

// Subcomponent: Individual Masonry Tile
interface GalleryTileProps {
  item: GalleryItem
  index: number
  isBulkMode: boolean
  isSelected: boolean
  onToggleSelect: () => void
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
  isAdmin: boolean
}

function GalleryTile({
  item,
  index,
  isBulkMode,
  isSelected,
  onToggleSelect,
  onClick,
  onEdit,
  onDelete,
  isAdmin,
}: GalleryTileProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <motion.div
      id={`gallery-tile-${item.id}`}
      tabIndex={0}
      role="button"
      className="gallery-tile"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.03, 0.3) }}
      onClick={() => {
        if (isBulkMode) onToggleSelect()
        else onClick()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (isBulkMode) onToggleSelect()
          else onClick()
        }
      }}
      style={{
        outline: isSelected ? `2.5px solid ${colors.orange}` : 'none',
        outlineOffset: '-2.5px',
      }}
    >
      {/* Navy Shimmer Placeholder until loaded */}
      {!loaded && (
        <div
          className="shimmer-placeholder"
          style={{
            width: '100%',
            height: '240px',
            borderRadius: '16px',
          }}
        />
      )}

      {/* Actual Image */}
      <img
        src={item.image_url}
        alt={item.title || item.caption || `Ruhuna Hockey ${item.category}`}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className="gallery-img"
        style={{
          width: '100%',
          height: 'auto',
          display: loaded ? 'block' : 'none',
          borderRadius: '16px',
          transition: 'transform 0.4s cubic-bezier(0.2, 0, 0.2, 1)',
        }}
      />

      {/* Featured Orange Star Badge */}
      {item.is_featured && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 3,
            background: 'rgba(11, 13, 38, 0.85)',
            border: `1px solid rgba(247, 148, 29, 0.5)`,
            borderRadius: '999px',
            padding: '3px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <span style={{ color: colors.orange, fontSize: '12px' }}>★</span>
        </div>
      )}

      {/* Bulk Checkbox */}
      {isBulkMode && (
        <div
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect()
          }}
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            zIndex: 4,
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: isSelected ? colors.orange : 'rgba(11, 13, 38, 0.85)',
            border: `2px solid ${isSelected ? colors.orange : '#ffffff'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          {isSelected && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.deepNavy}
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      )}

      {/* Admin RowActions (hover on desktop, always visible on touch) */}
      {isAdmin && !isBulkMode && (
        <div
          className="gallery-admin-bar"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            zIndex: 5,
            opacity: 0,
            transition: 'opacity 0.2s ease',
          }}
        >
          <RowActions onEdit={onEdit} onDelete={onDelete} />
        </div>
      )}

      {/* Dark gradient overlay revealing title + category chip on hover */}
      <div
        className="gallery-overlay"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '16px',
          background: 'linear-gradient(180deg, transparent 40%, rgba(11, 13, 38, 0.92) 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '16px',
          opacity: 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
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
            {item.category}
          </span>
          {item.taken_on && (
            <span style={{ fontSize: '11px', color: colors.grey, fontFamily: fonts.body }}>
              {fmtPhotoDate(item.taken_on)}
            </span>
          )}
        </div>

        {item.title && (
          <h4
            style={{
              fontFamily: fonts.heading,
              fontWeight: 600,
              fontSize: '15px',
              color: '#ffffff',
              margin: '0 0 4px',
              lineHeight: 1.3,
            }}
          >
            {item.title}
          </h4>
        )}

        {item.caption && (
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: '12px',
              color: colors.textSoft,
              margin: 0,
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {item.caption}
          </p>
        )}
      </div>
    </motion.div>
  )
}
