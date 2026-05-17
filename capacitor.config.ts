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
  plugins: {
    FirebaseAuthentication: {
      // App holds its session via the Firebase JS SDK (signInWithCredential),
      // so the native layer only opens the Google picker and returns the token.
      skipNativeAuth: true,
      providers: ["google.com"],
    },
  },
};

export default config;
