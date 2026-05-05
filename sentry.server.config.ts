import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      if (event.request.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      if (typeof event.request.data === "object" && event.request.data !== null) {
        event.request.data = "[masked]";
      }
    }
    return event;
  },
});
