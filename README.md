# 🏑 Ruhuna Hockey — Official Landing Page

The official portfolio and landing page for the **University of Ruhuna Hockey Team**. Built with a dark, cinematic aesthetic featuring full-screen hero field hockey footage, smooth Framer Motion micro-animations, and the official university hockey crest branding.

---

## 🎨 Visual Identity & Brand Palette

The design adheres to the official colors derived directly from the Ruhuna Hockey crest:

| Token | Hex | Role & Usage |
|---|---|---|
| **Navy** | `#2f3470` | Primary brand colour, button backgrounds, radial glows |
| **Deep Navy** | `#1c1f4a` | Dark pill backgrounds, avatar borders, shadow depth |
| **Orange** | `#f7941d` | Accent colour — highlighted headline word, hover states |
| **Dark Orange** | `#c2670a` | Second stop in avatar / badge gradients |
| **Light Grey** | `#e4e2e1` | Secondary highlights and soft text |
| **White** | `#ffffff` | Primary headline typography, nav links, icons |

> **Design Rules:** The interface maintains a cinematic dark mood. White text sits on the action footage with deep navy providing contrast and orange reserved strictly for high-impact accents.

---

## ⚡ Tech Stack

- **Framework:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Build Tool:** [Vite 8](https://vite.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) via `@tailwindcss/vite`
- **Animations:** [Framer Motion 12](https://motion.dev/) (orchestrated fade/slide entrances, interactive hover/tap scale)
- **Typography:** [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) & [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts

---

## 📁 Project Structure

```
Ruhuna-Hockey/
├── public/
│   ├── hero.mp4            # Field hockey background video
│   └── logo.png            # Ruhuna Hockey official crest / favicon
├── src/
│   ├── components/
│   │   ├── Navbar.tsx      # Transparent fixed navbar with crest & navigation pills
│   │   └── Hero.tsx        # Cinematic hero section with video background & social links
│   ├── App.tsx             # Root application component
│   ├── index.css           # Tailwind v4 import and base resets
│   └── main.tsx            # Application entry point
├── index.html              # HTML shell with Google Fonts & SEO metadata
├── package.json            # Project dependencies & scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration with Tailwind CSS v4 plugin
└── README.md               # Documentation
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm` or `pnpm`

### Installation

1. Clone or navigate to the repository:
   ```bash
   cd "Ruhuna-Hockey"
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

4. Open your browser and visit:
   ```
   http://localhost:5173/
   ```

---

## 🛠️ Build & Production

To generate the optimized production bundle:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

## 📹 Asset Management

- **Hero Video (`public/hero.mp4`):** Real field hockey match action video displayed with auto-play, looped, and muted properties. To replace with your own match footage, simply drop your video into `public/hero.mp4` (keep the file name).
- **Crest Logo (`public/logo.png`):** The circular official Ruhuna Hockey crest badge used in the navbar and as the site favicon.

---

## 🌐 Connect with the Team

- **Facebook:** [University of Ruhuna Hockey](https://web.facebook.com/uorhockey)
- **Instagram:** [@ruhuna.hockey](https://www.instagram.com/ruhuna.hockey/)
