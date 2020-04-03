import { log } from '../src/log'
import { parse } from 'semver'
import { writeFileSync, readFileSync, statSync } from 'fs-extra'
import { execSync } from 'child_process'
import { Octokit } from '@octokit/rest'
import { createInstallScript } from './create-install-script'

function replaceCurlCommand({
  file,
  oldVersion,
  newVersion,
}: {
  file: string
  oldVersion: string
  newVersion: string
}) {
  let atLeastOneLineChanged
  const lines = readFileSync(file)
    .toString()
    .split('\n')
    .map((line) => {
      if (line.match(/curl.*https/) && line.includes(oldVersion)) {
        atLeastOneLineChanged = true
        return line.replace(oldVersion, newVersion)
      }
      return line
    })

  if (!atLeastOneLineChanged) {
    log.fail(`Couldn't find a curl command in ${file}`)
  }

  writeFileSync(file, lines.join('\n'))
}

async function release() {
  if (!process.env.GH_TOKEN) {
    log.fail('Missing GH_TOKEN in env')
  }
  if (!process.env.NPM_TOKEN) {
    log.fail('Missing NPM_TOKEN in env')
  }
  const oldVersion = require('../package.json').version as string
  const newVersion = parse(oldVersion)?.inc('prerelease').version
  const releaseTag = 'v' + newVersion

  if (!oldVersion || !newVersion) {
    throw new Error('Unable to bump version')
  }

  const done = log.timedTask(`Releasing gudetama ${releaseTag}`)

  log.step('Bumping version in package.json, README.md, and config.yml')

  replaceCurlCommand({ file: './README.md', oldVersion, newVersion })
  replaceCurlCommand({
    file: './.circleci/config.yml',
    oldVersion,
    newVersion,
  })

  execSync(`npm version '${newVersion}' --git-tag-version false`, {
    stdio: 'inherit',
  })

  log.step('Creating and tagging commit')

  execSync(`git add ./README.md ./.circleci/config.yml ./package.json`, {
    stdio: 'inherit',
  })
  execSync(`git commit -m 'Release ${releaseTag} [skip ci]'`, {
    stdio: 'inherit',
  })
  execSync(`git tag -a '${releaseTag}' -m 'Release ${releaseTag}'`, {
    stdio: 'inherit',
  })

  log.step(`Building npm package`)
  execSync(`yarn build-npm`, { stdio: 'inherit' })

  log.step(`Building bundle`)
  execSync(`yarn build-bundle`, { stdio: 'inherit' })

  log.step(`Publishing npm package`)
  execSync(
    `npm set //registry.npmjs.org/:_authToken '${process.env.NPM_TOKEN}'`
  )
  execSync(`npm publish`)

  log.step(`Pushing to github`)
  execSync(`git push --follow-tags`, { stdio: 'inherit' })

  const gh = new Octokit({ auth: process.env.GH_TOKEN })

  log.step(`Creating github release`)
  const releaseResponse = await gh.repos.createRelease({
    owner: 'artsy',
    repo: 'gudetama',
    prerelease: true,
    tag_name: releaseTag,
  })

  if (releaseResponse.status >= 400) {
    log.fail(`Couldn't make github release`, {
      detail: JSON.stringify(releaseResponse, null, '  '),
    })
  }

  log.step(`Uploading release artifacts`)
  log.substep(`install.sh`)

  writeFileSync('install.sh', createInstallScript({ releaseTag }))
  await gh.repos.uploadReleaseAsset({
    repo: 'gudetama',
    owner: 'artsy',
    release_id: releaseResponse.data.id,
    data: readFileSync('install.sh') as any,
    name: 'install.sh',
    headers: {
      'content-type': 'application/octet-stream',
      'content-length': statSync('install.sh').size,
    },
  })

  log.substep(`gudetama.${releaseTag}.js`)
  await gh.repos.uploadReleaseAsset({
    repo: 'gudetama',
    owner: 'artsy',
    release_id: releaseResponse.data.id,
    data: readFileSync(`gudetama.${releaseTag}.js`) as any,
    name: `gudetama.${releaseTag}.js`,
    headers: {
      'content-type': 'application/octet-stream',
      'content-length': statSync(`gudetama.${releaseTag}.js`).size,
    },
  })

  done('Completed release!')
}

async function run() {
  try {
    await release()
  } catch (e) {
    log.fail('release script failed', { error: e })
  }
}

run()
