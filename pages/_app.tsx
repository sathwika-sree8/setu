// pages/_app.tsx  <-- create this only if it doesn't exist; otherwise add the imports and component to your existing file
import type { AppProps } from "next/app";
import * as Sentry from "@sentry/react";
import { Integrations } from "@sentry/tracing";
import PresetSentryButton from "../components/PresetSentryButton";
import "../styles/globals.css";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    integrations: [new Integrations.BrowserTracing()],
    tracesSampleRate: 0.1,
  });
}

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      {/* keep the Sentry button last so it overlays content */}
      <PresetSentryButton />
    </>
  );
}