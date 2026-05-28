import * as Sentry from '@sentry/nextjs'

const isSentryEnabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN)

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (isSentryEnabled) {
      await import('./sentry.server.config')
    }
    const { registerFormCrmResolver } = await import('./lib/registerFormCrm')
    registerFormCrmResolver()
  }

  if (process.env.NEXT_RUNTIME === 'edge' && isSentryEnabled) {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = isSentryEnabled
  ? Sentry.captureRequestError
  : (_error: unknown) => {}
