import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

/** Vrai dans l'APK, faux sur le site. */
export const isNative = (): boolean => Capacitor.isNativePlatform()

/**
 * Ouvre un lien hors de l'application.
 * Sur Android, passe par un onglet Chrome : c'est lui qui affiche le PDF et
 * qui gère le téléchargement dans le dossier « Téléchargements ».
 */
export async function openExternal(url: string): Promise<void> {
  if (isNative()) {
    await Browser.open({ url })
    return
  }
  window.open(url, '_blank', 'noopener')
}

/** Propose l'enregistrement du fichier (téléchargement direct sur le site). */
export async function downloadFile(url: string, filename: string): Promise<void> {
  if (isNative()) {
    await openExternal(url)
    return
  }

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}
