import eslint from '@eslint/js'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'
import globals from 'globals'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig(eslint.configs.recommended, tseslint.configs.recommended, {
    languageOptions: {
        globals: {
            ...globals.es2021,
            ...globals.node,
        },
        parserOptions: {
            projectService: {
                allowDefaultProject: ['*.js', '*.mjs'],
            },
            tsconfigRootDir: __dirname,
        },
    },
    rules: {
        'no-console': 'error',
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                argsIgnorePattern: '_',
            },
        ],
    },
})
