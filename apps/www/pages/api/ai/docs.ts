import { SupabaseClient } from '@supabase/supabase-js'
import { ApplicationError, UserError, clippy } from 'ai-commands/edge'
import type { NextApiRequest, NextApiResponse } from 'next'
import OpenAI from 'openai'

// Node runtime avoids Vercel Hobby's 1 MB Edge Function bundle limit (OpenAI + tiktoken).
export const config = {
  api: {
    responseLimit: false,
  },
}

const openAiKey = process.env.OPENAI_API_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  if (!openAiKey) {
    return res.status(500).json({
      error: 'No OPENAI_API_KEY set. Create this environment variable to use AI features.',
    })
  }

  if (!supabaseUrl) {
    return res.status(500).json({
      error:
        'No NEXT_PUBLIC_SUPABASE_URL set. Create this environment variable to use AI features.',
    })
  }

  if (!supabaseServiceKey) {
    return res.status(500).json({
      error:
        'No NEXT_PUBLIC_SUPABASE_ANON_KEY set. Create this environment variable to use AI features.',
    })
  }

  const openai = new OpenAI({ apiKey: openAiKey })
  const { messages } = req.body as {
    messages: { content: string; role: 'user' | 'assistant' }[]
  }

  if (!messages) {
    return res.status(400).json({ error: 'Missing messages in request data' })
  }

  const supabaseClient = new SupabaseClient(supabaseUrl, supabaseServiceKey)

  try {
    const response = await clippy(openai, supabaseClient, messages)

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    if (!response.body) {
      return res.status(500).json({ error: 'There was an error processing your request' })
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(decoder.decode(value, { stream: true }))
    }

    return res.end()
  } catch (error: unknown) {
    console.error(error)
    if (error instanceof UserError) {
      return res.status(400).json({ error: error.message, data: error.data })
    } else if (error instanceof ApplicationError) {
      console.error(`${error.message}: ${JSON.stringify(error.data)}`)
    } else {
      console.error(error)
    }

    return res.status(500).json({ error: 'There was an error processing your request' })
  }
}
