import { lazy, Suspense } from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Footer from '../components/Footer'
import AdminBar from '../components/AdminBar'
import { colors } from '../lib/theme'

// Below-the-fold sections lazily loaded with Suspense for optimal performance & code splitting
const About = lazy(() => import('../components/sections/About'))
const Team = lazy(() => import('../components/sections/Team'))
const Fixtures = lazy(() => import('../components/sections/Fixtures'))
const Achievements = lazy(() => import('../components/sections/Achievements'))
const Events = lazy(() => import('../components/sections/Events'))
const Gallery = lazy(() => import('../components/sections/Gallery'))
const Sponsors = lazy(() => import('../components/sections/Sponsors'))
const Contact = lazy(() => import('../components/sections/Contact'))

function SectionSkeleton() {
  return (
    <div
      style={{
        padding: '100px clamp(20px, 5vw, 64px)',
        maxWidth: '1240px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          width: '100px',
          height: '14px',
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.06)',
          marginBottom: '14px',
        }}
      />
      <div
        style={{
          width: '240px',
          height: '34px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.06)',
          marginBottom: '32px',
        }}
      />
      <div
        style={{
          height: '280px',
          borderRadius: '24px',
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${colors.glassBorder}`,
        }}
      />
    </div>
  )
}

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <Hero />
        <Suspense fallback={<SectionSkeleton />}>
          <About />
          <Team />
          <Fixtures />
          <Achievements />
          <Events />
          <Gallery />
          <Sponsors />
          <Contact />
        </Suspense>
      </main>
      <Footer />
      <AdminBar />
    </>
  )
}
