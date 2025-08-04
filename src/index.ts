// Copyright © 2025 JalapenoLabs

/* eslint-disable max-len */

import './env'

// Core
import chalk from 'chalk'
import { openai } from './llm'
import { Timer } from './timer'

// Node.js
import klaw from 'klaw'
import { dirname, resolve } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'

const inputDirectory = resolve(process.cwd(), '../')

const convertLanguagePrompt = `
You will be given a language, and a Rimworld mod xml file to translate.
You must translate the appropriate user-facing strings in the xml file to the specified language.

# Example input:
1.6/Defs/ThoughtDef/PleasantFishingTrip.xml
\`\`\`
<?xml version="1.0" encoding="utf-8"?>
<Defs>
  <ThoughtDef>
    <defName>PleasantFishingTrip</defName>
    <durationDays>0.25</durationDays>
    <stackLimit>1</stackLimit>
    <thoughtClass>Thought_Memory</thoughtClass>
    <label>pleasant fishing trip</label>
    <stages>
      <li>
        <label>Went fishing</label>
        <description>It was nice to enjoy some peace while fishing for a bit.</description>
        <baseMoodEffect>3</baseMoodEffect>
      </li>
    </stages>
  </ThoughtDef>
</Defs>
\`\`\`

# Example output:
1.6/Languages/Catalan/DefInjected/ThoughtDef/PleasantFishingTrip.xml
\`\`\`
<?xml version="1.0" encoding="utf-8"?>
<LanguageData>

  <PleasantFishingTrip.label>Agradable jornada de pesca</PleasantFishingTrip.label>
  <PleasantFishingTrip.stages.Went_fishing.label>Va anar a pescar</PleasantFishingTrip.stages.Went_fishing.label>
  <PleasantFishingTrip.stages.Went_fishing.description>Va ser agradable gaudir d'una mica de pau mentre pescava durant una estona.</PleasantFishingTrip.stages.Went_fishing.description>

</LanguageData>
\`\`\`

You will be expected to also provide the path to the new file, and ensure that the output is in the correct format for RimWorld modding.

# Path formatting:
<Version>/Languages/<Language>/DefInjected/<MatchedRelativePath>/<OriginalFileName>.xml
If the source file starts with a version number, like "1.6/", you must also include that in the output path.
If a version is not present, just start with "Languages/**"

Other path examples:
In: 1.6/Defs/ThoughtDef/PleasantFishingTrip.xml
Out: 1.6/Languages/Catalan/DefInjected/ThoughtDef/PleasantFishingTrip.xml

In: Defs/ResearchDef/ResearchProjectDef.xml
Out: Languages/French/DefInjected/ResearchDef/ResearchProjectDef.xml

In: 1.5/Defs/BuildingDef/SkyScraperDef/SkyRise.xml
Out: 1.5/Languages/French/DefInjected/BuildingDef/SkyScraperDef/SkyRise.xml

# Additional documentation
https://rimworldwiki.com/wiki/Modding_Tutorials/Localization
`

const supportedLanguages = [
  'Catalan',
  'ChineseSimplified',
  'ChineseTraditional',
  'Czech',
  'Danish',
  'Dutch',
  'English',
  'Estonian',
  'Finnish',
  'French',
  'German',
  'Greek',
  'Hungarian',
  'Italian',
  'Japanese',
  'Korean',
  'Norwegian',
  'Polish',
  'Portuguese',
  'PortugueseBrazilian',
  'Romanian',
  'Russian',
  'Slovak',
  'Spanish',
  'SpanishLatin',
  'Swedish',
  'Turkish',
  'Ukrainian',
  'Vietnamese',
]

let totalGptTokensUsed = 0

async function main() {
  const allTimer = new Timer('Full translation')

  const openaiPromises: Promise<any>[] = []

  for await (const { path } of klaw(inputDirectory)) {
    if (
      !path.endsWith('.xml')
      || path.endsWith('About.xml')
      || (path.includes('/Languages/') || path.includes('\\Languages\\'))
    ) {
      continue
    }

    let isFirst = true
    for (const language of supportedLanguages) {
      if (isFirst) {
        // Do the very first request synchronously
        // So that way, the system prompt can be cached within the OpenAI API
        // This will speed up subsequent requests and save $$ on token usage
        // This also gives the convertFile function a chance to cache the read file contents
        await convertFile(language, path, true)
        isFirst = false
        continue
      }

      openaiPromises.push(
        convertFile(language, path),
      )
    }
  }

  const results = await Promise.allSettled(openaiPromises)
  const successfulResults = results.filter(
    (result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled',
  )
  const failedResults = results.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  )

  allTimer.stop()
  console.debug(
    chalk.gray('Total GPT tokens used:', totalGptTokensUsed)
  )
  if (failedResults.length > 0) {
    console.error(
      chalk.red(`Some files failed to process: ${failedResults.length} errors.`),
    )
  } else {
    console.log(
      chalk.green(`All files processed successfully: ${successfulResults.length} files.`),
    )
  }
}

const cachedFileContents: Record<string, string> = {}
async function getCachedFileContents(filePath: string): Promise<string> {
  if (cachedFileContents[filePath]) {
    return cachedFileContents[filePath]
  }

  const contents = await readFile(filePath, 'utf-8')
  cachedFileContents[filePath] = contents

  return contents
}

async function convertFile(language: string, inputFilePath: string, isFirst = false) {
  const relativePath = inputFilePath.replace(inputDirectory, '')

  const timer = isFirst
    ? new Timer(`First ${relativePath} to ${language}`)
    : new Timer(`${relativePath} to ${chalk.magenta(language)}`)

  const contents = await getCachedFileContents(inputFilePath)

  console.log(`Converting ${chalk.cyan(relativePath)} -> ${chalk.magenta(language)}`)

  const result = await openai.chat.completions.create({
    model: 'o4-mini',
    messages: [
      {
        role: 'system',
        content: convertLanguagePrompt,
      },
      {
        role: 'developer',
        content: `You will be expected to provide the output file in backticks, with the path to the new file on the first line, followed by the translated XML content`,
      },
      {
        role: 'user',
        content: `Language: '${language}'`
      },
      {
        role: 'user',
        content: `${relativePath}\n\`\`\`${contents}\`\`\``
      }
    ]
  })

  totalGptTokensUsed = result.usage?.total_tokens || 0
  const output = result.choices[0].message.content.trim()

  if (!output) {
    console.error(chalk.red(`Failed to translate ${relativePath} to ${language}`))
    return
  }

  if (!output.includes('```')) {
    console.error(
      chalk.red(`Invalid output format for ${relativePath} to ${language}`)
    )
    return
  }

  let [ outputPath, ...xmlContentLines ] = output.trim().split('```')
  outputPath = outputPath
    .trim()
    // Remove leading slash if present
    .replace(/^\//, '')
    // Removing leading or trailing backticks
    .replace(/^`+|`+$/g, '')

  let xmlContent = xmlContentLines.join('\n').trim()

  // There may be a 'xml' prefix leftover from the backtick fence '```xml'
  if (xmlContent.startsWith('xml')) {
    // If the XML content starts with the XML declaration, remove it
    xmlContent = xmlContent.replace(/^xml/i, '').trim()
  }

  xmlContent = xmlContent
    // Removing leading or trailing backticks
    .replace(/^`+|`+$/g, '')
    .trim()

  const outputFile = resolve(inputDirectory, outputPath)
  const outputDir = dirname(outputFile)

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  await writeFile(outputFile, xmlContent, 'utf-8')

  timer.stop()
}

main()
