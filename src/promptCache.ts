// Copyright © 2025 JalapenoLabs

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

// File lib
import { createHashForText } from './sha256'
import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'


const PROMPT_CACHE_DIR = resolve(
  __dirname,
  '..',
  '.prompt-cache'
)

export async function loadCache(input: ChatCompletionMessageParam[]): Promise<string | null> {
  try {
    const cacheFile = promptToCacheFile(input)
    if (!cacheFile || !existsSync(cacheFile)) {
      return null
    }

    return await readFile(cacheFile, 'utf-8')
  }
  catch {
    return null
  }
}

export async function saveCache(input: ChatCompletionMessageParam[], output: string): Promise<void> {
  try {
    const cacheFile = promptToCacheFile(input)
    if (!cacheFile || !output) {
      return
    }

    await writeFile(cacheFile, output, 'utf-8')
  }
  catch (error) {
    console.error('Failed to save prompt to cache:', error)
  }
}

function promptToCacheFile(input: ChatCompletionMessageParam[]): string | null {
  if (!input || input.length === 0) {
    return null
  }

  let prompt = ''
  for (const message of input) {
    prompt += `${message.role}: ${message.content}\n`
  }

  if (!existsSync(PROMPT_CACHE_DIR)) {
    mkdirSync(PROMPT_CACHE_DIR, { recursive: true })
  }

  const cacheKey = createHashForText(prompt)
  const cacheFile = resolve(
    PROMPT_CACHE_DIR,
    `${cacheKey}.json`,
  )

  return cacheFile
}
