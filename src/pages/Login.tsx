import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { colors, fonts } from '../lib/theme'
import { Field, FormError, inputStyle } from '../components/ui/FormFields'

export default function Login() {
  const { user, loading: authLoading, signIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (!authLoading && user) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const errMessage = await signIn(email, password)
    if (errMessage) {
      setErr(errMessage)
      setBusy(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: '24px',
        background: colors.ink,
      }}
    >
      {/* Background Video */}
      <video
        src="/hero.mp4"
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
        }}
      />

      {/* Dark overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(11,13,38,0.72)',
          pointerEvents: 'none',
        }}
      />

      {/* Soft navy radial glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(47,52,112,0.45) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Login Card + Back link container */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '420px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.16)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '24px',
            padding: '36px 30px',
            boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          }}
        >
          {/* Top of Card */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '26px' }}>
            <img
              src="/logo.png"
              alt="Ruhuna Hockey crest"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '999px',
                border: '2px solid #ffffff',
                objectFit: 'cover',
                background: '#ffffff',
                boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
                marginBottom: '16px',
              }}
            />
            <h1
              style={{
                fontFamily: fonts.heading,
                fontWeight: 600,
                fontSize: '26px',
                color: '#ffffff',
                margin: 0,
              }}
            >
              Admin Login
            </h1>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: '13.5px',
                color: colors.grey,
                marginTop: '6px',
                marginBottom: 0,
              }}
            >
              Sign in to manage the Ruhuna Hockey site.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Field label="Email">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                placeholder="admin@ruhuna.ac.lk"
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                placeholder="••••••••"
              />
            </Field>

            <FormError message={err} />

            <button
              type="submit"
              disabled={busy}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '999px',
                background: colors.orange,
                border: 'none',
                color: colors.deepNavy,
                fontSize: '14.5px',
                fontWeight: 700,
                fontFamily: fonts.body,
                cursor: busy ? 'wait' : 'pointer',
                opacity: busy ? 0.75 : 1,
                marginTop: '10px',
                boxShadow: '0 6px 22px rgba(247,148,29,0.3)',
                transition: 'opacity 0.2s',
              }}
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </motion.div>

        {/* Back link */}
        <Link
          to="/"
          style={{
            marginTop: '20px',
            color: colors.textSoft,
            fontSize: '13.5px',
            fontFamily: fonts.body,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = colors.textSoft)}
        >
          ← Back to site
        </Link>
      </div>
    </div>
  )
}
