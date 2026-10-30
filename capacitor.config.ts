import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dashworld.game',
  appName: 'DashWorld',
  webDir: 'dist',
  backgroundColor: '#050b2e',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#050b2e',
    },
  },
};

export default config;
