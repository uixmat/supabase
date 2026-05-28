import { SupabaseClient } from '@supabase/supabase-js'
import { ApplicationError, UserError, clippy } from 'ai-commands/edge'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

import { isFeatureEnabled } from 'common/enabled-features'

// Node runtime avoids Vercel Hobby's 1 MB Edge Function bundle limit (OpenAI + tiktoken).
export const runtime = 'nodejs'
export const maxDuration = 60

const openAiKey = process.env.OPENAI_API_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

export async function POST(req: NextRequest) {
  if (!openAiKey || !supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing environment variables for AI features.' },
      { status: 500 }
    )
  }

  const openai = new OpenAI({ apiKey: openAiKey })
  const supabaseClient = new SupabaseClient(supabaseUrl, supabaseServiceKey)

  try {
    const { messages } = (await req.json()) as {
      messages: { content: string; role: 'user' | 'assistant' }[]
    }

    if (!messages) {
      throw new UserError('Missing messages in request data')
    }

    const useAltSearchIndex = !isFeatureEnabled('search:fullIndex')
    const response = await clippy(openai, supabaseClient, messages, {
      useAltSearchIndex,
    })

    // Proxy the streamed SSE response from OpenAI
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
      },
    })
  } catch (error: unknown) {
    console.error(error)
    if (error instanceof UserError) {
      return NextResponse.json({ error: error.message, data: error.data }, { status: 400 })
    } else if (error instanceof ApplicationError) {
      console.error(`${error.message}: ${JSON.stringify(error.data)}`)
    } else {
      console.error(error)
    }

    return NextResponse.json(
      { error: 'There was an error processing your request' },
      { status: 500 }
    )
  }
}
