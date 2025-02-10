#!/usr/bin/env node

'use strict'

// Copy the template and get everything ready for developing.

import chalk from 'chalk'
import fs from 'fs-extra'
import path from 'path'
import { execSync } from 'child_process'
import inquirer from 'inquirer'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const appName = process.argv[2] || 'my-app'
const appPath = path.join(process.cwd(), appName)

const templates = [
  { name: 'Typescript', value: 'cra-template-universal-ts' },
  { name: 'Default JS', value: 'cra-template-universal' },
  { name: 'Custom Template (Enter Manually)', value: 'custom' }
]

console.log(chalk.green(`🚀 Creating proyect in: ${appPath}`))

if (fs.existsSync(appPath)) {
  console.error(
    chalk.red('⚠️ This directory already exists. Use another name.')
  )
  process.exit(1)
}

const { template } = await inquirer.prompt([
  {
    type: 'list',
    name: 'template',
    message: 'Select a template:',
    choices: templates
  }
])

let templateName = template
if (template === 'custom') {
  const { customTemplate } = await inquirer.prompt([
    {
      type: 'input',
      name: 'customTemplate',
      message: 'Enter the name of the custom template:',
      validate: (input) =>
        input.trim() ? true : '❗Template name cannot be empty'
    }
  ])
  templateName = customTemplate
}

console.log(chalk.cyan(`📦 Using template: ${templateName}`))

fs.mkdirSync(appPath, { recursive: true })

console.log('📥 Installing template...')

// Determine if we should use yarn or npm
let shouldUseYarn
try {
  execSync('yarn --version', { stdio: 'ignore' })
  shouldUseYarn = true
} catch {
  shouldUseYarn = false
}

const cmd = shouldUseYarn ? ['yarn', 'add'] : ['npm', 'install', '--save']
const cmdRemove = shouldUseYarn ? ['yarn', 'remove'] : ['npm', 'uninstall']
const cmdDev = shouldUseYarn ? ['yarn', 'add', '-D'] : ['npm', 'install', '-D']

try {
  execSync('npm init -y', {
    stdio: 'ignore',
    cwd: appPath
  })
  execSync(`${cmd.join(' ')} ${templateName}`, {
    stdio: 'ignore',
    cwd: appPath
  })
} catch (err) {
  console.error(
    chalk.red(`❌ Error installing template ${templateName}: `, err)
  )
  process.exit(1)
}

console.log('📂 Copying template files...')

const templatePath = path.join(
  appPath,
  'node_modules',
  templateName,
  'template'
)
fs.copySync(templatePath, appPath)

const filesToRename = ['gitignore', 'eslintrc', 'prettierrc', 'prettierignore']

// After copying tasks
filesToRename.forEach((file) => {
  try {
    fs.renameSync(
      path.resolve(appPath, file),
      path.resolve(appPath, '.' + file)
    )
  } catch (err) {
    chalk.red(`❌ Error copying template ${templateName}: `, err)
  }
})

const templateInfo = require(
  path.join(appPath, 'node_modules', templateName, 'template.json')
)

const appPackage = require(path.join(appPath, 'package.json'))

const templatePackage = templateInfo.package || {}

appPackage.scripts = {
  start: 'universal-scripts start',
  build: 'universal-scripts build',
  test: 'universal-scripts test',
  serve: 'node build/server/server.js',
  lint: 'eslint src',
  'heroku-postbuild': 'npm run build',
  ...templatePackage.scripts
}

appPackage.engines = {
  node: '>=18'
}

appPackage.private = true

delete appPackage.main

fs.writeFileSync(
  path.join(appPath, 'package.json'),
  JSON.stringify(appPackage, null, 2)
)

const toInstallDeps = Object.entries({
  ...templatePackage.dependencies,
  'universal-scripts': 'latest'
})
const toInstallDevDeps = Object.entries(templatePackage.devDependencies)

if (toInstallDeps.length) {
  console.log('📥 Installing dependencies...')
  cmd.push(
    ...toInstallDeps.map(([dependency, version]) => dependency + '@' + version)
  )
  execSync(cmd.join(' '), { stdio: 'ignore', cwd: appPath })
} else {
  console.log('🔹 Template has no dependencies; skipping install...')
  console.log(templateInfo)
}

if (toInstallDevDeps.length) {
  console.log('📥 Installing dev dependencies...')
  cmdDev.push(
    ...toInstallDevDeps.map(
      ([dependency, version]) => dependency + '@' + version
    )
  )
  execSync(cmdDev.join(' '), { stdio: 'ignore', cwd: appPath })
} else {
  console.log('🔹 Template has no dev dependencies; skipping install...')
  console.log(templateInfo)
}

console.log('🧹 Removing template dependency...')
execSync(`${cmdRemove.join(' ')} ${templateName}`, {
  stdio: 'ignore',
  cwd: appPath
})

// Done!
console.log(
  chalk.green.bold('✅ Init completed.') + ' Now you might want to run:'
)
console.log(
  chalk.gray('  $ ') +
    chalk.cyan('cd ' + appName + ` && ${shouldUseYarn ? 'yarn' : 'npm'} start`)
)
