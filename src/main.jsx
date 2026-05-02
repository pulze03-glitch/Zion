// Polyfill crypto.randomUUID for iOS Safari < 15.4
if (!crypto.randomUUID) {
  crypto.randomUUID = () => {
    const b = crypto.getRandomValues(new Uint8Array(16))
    b[6] = (b[6] & 0x0f) | 0x40
    b[8] = (b[8] & 0x3f) | 0x80
    return [...b].map((v, i) =>
      ([4,6,8,10].includes(i) ? '-' : '') + v.toString(16).padStart(2, '0')
    ).join('')
  }
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { PlayerProvider }    from './context/PlayerContext'
import { LibraryProvider }   from './context/LibraryContext'
import { SettingsProvider }  from './context/SettingsContext'
import { SidebarProvider }   from './context/SidebarContext'
import { WallpaperProvider } from './context/WallpaperContext'
import { ToastProvider }    from './context/ToastContext'
import { AuthProvider }     from './context/AuthContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <WallpaperProvider>
            <LibraryProvider>
              <PlayerProvider>
                <SidebarProvider>
                  <ToastProvider>
                    <App />
                  </ToastProvider>
                </SidebarProvider>
              </PlayerProvider>
            </LibraryProvider>
          </WallpaperProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
