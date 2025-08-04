// Copyright © 2025 JalapenoLabs

import { defineConfig } from 'eslint/config'
import cliBaseConfig from '@jalapenolabs/cli/eslint'

export default defineConfig([{
  extends: [ cliBaseConfig ],
}])
