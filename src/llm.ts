// Copyright © 2025 JalapenoLabs

// Core
import chalk from 'chalk'
import { OpenAI } from 'openai'
import { safeParseJson, safeStringifyJson } from './json'

// Utility
import { loadCache, saveCache } from './promptCache'

// THIS FILE IS TO BE DEPRECATED, IN FAVOR OF LANGGRAPH

// This requires the OPENAI_API_KEY environment variable to be set
export const openai = new OpenAI()

// We override the chat completions create method to add caching functionality

const originalCreate = openai.chat.completions.create.bind(openai.chat.completions)

// @ts-ignore
openai.chat.completions.create = async (body, options) => {
  const cachedResponse = await loadCache(body.messages)
  if (cachedResponse) {
    console.log(
      chalk.gray('[CACHE]: Cache hit for prompt')
    )
    return safeParseJson(cachedResponse, null, 2)
  }

  const response = await originalCreate(body, options)

  await saveCache(body.messages, safeStringifyJson(response))

  return response
}
