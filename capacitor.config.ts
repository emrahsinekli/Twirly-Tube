import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.twirlytube.game',
  appName: 'Twirly Tube',
  webDir: 'dist',
  backgroundColor: '#5FB4DE',
  android: {
    allowMixedContent: false
  },
  ios: {
    contentInset: 'never'
  }
};

export default config;
