import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bigvegi.app',
  appName: 'Big Vegi',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#0c1a14',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#10b981',
    },
    StatusBar: {
      style: 'Default',
      backgroundColor: '#16a34a',
    },
    // Native Google Sign-In plugin — no browser redirect needed
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // This is the Web Client ID from Google Cloud Console
      // Firebase project: gen-lang-client-0500520630
      // Get it from: Firebase Console → Project Settings → Google Sign-In → Web SDK configuration
      serverClientId: '359145535347-d07p35nmlbbnn3qvk7eoilk4aqag49ea.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
