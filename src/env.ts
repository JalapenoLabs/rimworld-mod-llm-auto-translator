// Copyright © 2025 JalapenoLabs

import 'dotenv/config'

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not set. Please set it to use the OpenAI API.')
}
