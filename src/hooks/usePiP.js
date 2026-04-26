/**
 * usePiP — Document Picture-in-Picture API
 *
 * Opens a floating always-on-top window that stays visible even when the user
 * switches to another tab or app (e.g. Google Docs). The PiP window shares the
 * same JS context as the main page, so PlayerContext works inside it directly.
 *
 * Supported: Chrome 116+ desktop. Falls back gracefully on unsupported browsers.
 */
import { useCallback, useState } from 'react'

function copyStylesIntoPiP(pipDoc) {
  // Copy all <style> and <link rel="stylesheet"> from the main document
  ;[...document.styleSheets].forEach((sheet) => {
    try {
      const css = [...sheet.cssRules].map((r) => r.cssText).join('\n')
      const style = pipDoc.createElement('style')
      style.textContent = css
      pipDoc.head.appendChild(style)
    } catch {
      // Cross-origin sheet — link it by href instead
      if (sheet.href) {
        const link = pipDoc.createElement('link')
        link.rel = 'stylesheet'
        link.href = sheet.href
        pipDoc.head.appendChild(link)
      }
    }
  })
}

export function usePiP() {
  const [pipWindow, setPipWindow] = useState(null)

  const isSupported =
    typeof window !== 'undefined' && 'documentPictureInPicture' in window

  const openPiP = useCallback(async () => {
    if (!isSupported) return

    // If already open, just focus it
    if (pipWindow) {
      pipWindow.focus()
      return
    }

    try {
      const pip = await window.documentPictureInPicture.requestWindow({
        width: 290,
        height: 420,
        disallowReturnToOpener: false,
      })

      // Styles
      copyStylesIntoPiP(pip.document)
      pip.document.documentElement.style.colorScheme = 'dark'
      pip.document.body.style.cssText =
        'margin:0;padding:0;background:#000;overflow:hidden;height:100vh'

      setPipWindow(pip)
      pip.addEventListener('pagehide', () => setPipWindow(null))
    } catch (err) {
      console.warn('PiP failed:', err)
    }
  }, [isSupported, pipWindow])

  const closePiP = useCallback(() => {
    pipWindow?.close()
    setPipWindow(null)
  }, [pipWindow])

  return { pipWindow, openPiP, closePiP, isOpen: !!pipWindow, isSupported }
}
