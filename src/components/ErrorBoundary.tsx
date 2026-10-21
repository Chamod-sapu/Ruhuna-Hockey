import { Component, type ErrorInfo, type ReactNode } from 'react'
import { colors, fonts } from '../lib/theme'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            background: colors.ink,
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            fontFamily: fonts.body,
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              borderRadius: '24px',
              background: `linear-gradient(135deg, ${colors.deepNavy}, ${colors.ink})`,
              border: `1px solid rgba(247, 148, 29, 0.4)`,
              padding: 'clamp(28px, 5vw, 44px)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '999px',
                background: 'rgba(247, 148, 29, 0.15)',
                color: colors.orange,
                fontSize: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              ⚠️
            </div>

            <h2
              style={{
                fontFamily: fonts.heading,
                fontSize: '24px',
                fontWeight: 700,
                color: '#ffffff',
                margin: '0 0 10px',
              }}
            >
              Something went wrong
            </h2>

            <p
              style={{
                fontSize: '14.5px',
                color: colors.textSoft,
                lineHeight: 1.6,
                margin: '0 0 26px',
              }}
            >
              An unexpected issue occurred. Please refresh the page to continue exploring Ruhuna Hockey.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 28px',
                  borderRadius: '999px',
                  background: colors.orange,
                  color: colors.deepNavy,
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 18px rgba(247, 148, 29, 0.35)',
                }}
              >
                Refresh Page ↻
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
