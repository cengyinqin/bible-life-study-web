import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.neebooks.biblelife',
  appName: '圣经生命读经',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
};

export default config;
