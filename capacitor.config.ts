import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Le dossier `android/` n'est pas versionné : il se régénère avec
 * `npm run android:add` (localement) ou dans le workflow GitHub Actions.
 * Le nom arabe n'atterrit que dans `strings.xml`, jamais dans Gradle.
 */
const config: CapacitorConfig = {
  appId: 'ma.halaqa.tracker',
  appName: 'متابعة الحلقة',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
}

export default config
