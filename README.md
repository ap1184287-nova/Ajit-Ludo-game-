# LUDO MOD — 3D Offline Ludo PWA

**POWERED BY AJIT KUMAR**

A mobile-first 3D Ludo Progressive Web App built with React, TypeScript, Three.js, and Tailwind CSS. Designed for smooth offline gameplay on Android, iOS, and desktop browsers.

## Features

- **3D Tabletop Ludo Board**: Crisp, stationary Three.js board with glossy animated tokens, smooth step hops, capture animations, and custom `faaah.mp3` sound effects.
- **Easy & Fast Game Menu**: One-tap quick modes (**VS Computer**, **Pass & Play**, **2P Duel**, **Beginner Practice**), instant **2P / 3P / 4P** & AI difficulty toggles directly on the Home screen, plus full seat & coin stake customization.
- **LUDO PLAYER SYSTEM**: Multi-player profile dashboard (`Black & Electric Blue` theme) with auto-generated immutable Player IDs (`LPS-XXXXXX`), optional 4-digit Edit/Delete PIN locks, tamper checksum protection, and separated per-player match statistics.
- **Secret Hack Mode**: Unlockable in Game Settings (PIN `7890`) for scoped dice testing (`1–6` number pad with Hide/Show toggle).
- **Installable Offline PWA**: Pre-caches app code, icons, and sound effects via `vite-plugin-pwa` so the full game runs completely offline from your mobile or desktop Home Screen.

## Quick Start (Local Development)

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## Uploading to GitHub & Hosting as a PWA

1. Initialize and push to a new GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: LUDO MOD 3D PWA"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
   git push -u origin main
   ```
2. **Recommended 1-Click PWA Hosting (HTTPS automatically enabled)**:
   - **Vercel** or **Netlify** or **Cloudflare Pages**: Connect your GitHub repository directly.
     - Build Command: `npm run build`
     - Output Directory: `dist`
3. Once deployed over HTTPS, open the site on Android Chrome or iOS Safari and tap **Install App** (or **Add to Home Screen**).
