import * as Sentry from '@sentry/nextjs'

const isSentryEnabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN)

export async function register() {
  if (!isSentryEnabled) return

  // eslint-disable-next-line turbo/no-undeclared-env-vars
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  // eslint-disable-next-line turbo/no-undeclared-env-vars
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = isSentryEnabled
  ? Sentry.captureRequestError
  : (_error: unknown) => {}
