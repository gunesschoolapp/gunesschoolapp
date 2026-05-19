import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gunesenglish.app',
  appName: 'Gunes English School',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1e3a5f',
      showSpinner: true,
      spinnerColor: '#3b82f6',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1e3a5f',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
