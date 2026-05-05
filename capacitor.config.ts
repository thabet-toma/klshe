import type { CapacitorConfig } from "@capacitor/cli";

const appUrl = "https://klshe.vercel.app";

const config: CapacitorConfig = {
  appId: 'app.jetek.mobile',
  appName: 'Jetek',
  webDir: "mobile-web",
  server: {
    url: appUrl,
    cleartext: false,
    androidScheme: "https",
  },
};

export default config;
