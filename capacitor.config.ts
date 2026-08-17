import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gunesenglish.app',
  appName: 'Gunes English School',
  webDir: 'dist',
  plugins: {

    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    GoogleSignIn: {
      clientId: '438062176512-e4iqdc3g40uv02jd5rmk2i153hd0c43d.apps.googleusercontent.com',
    },
  },
};

export default config;
