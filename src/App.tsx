import { useState } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import ContactModal from './components/ContactModal'
import './index.css'

function App() {
  const [isContactOpen, setIsContactOpen] = useState(false)

  return (
    <div className="w-full min-h-screen bg-black text-white selection:bg-[#f7941d] selection:text-[#1c1f4a]">
      <Navbar onOpenContact={() => setIsContactOpen(true)} />
      <main>
        <Hero onOpenContact={() => setIsContactOpen(true)} />
      </main>
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
    </div>
  )
}

export default App

