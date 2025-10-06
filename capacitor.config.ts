import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.1e47e2c726084fccbff76fa229db4803',
  appName: 'BR-LEGAL 2',
  webDir: 'dist',
  server: {
    url: 'https://1e47e2c7-2608-4fcc-bff7-6fa229db4803.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
