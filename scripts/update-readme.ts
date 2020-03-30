import fs from 'fs'

const commitHash = process.argv[2]

const readmeLines = fs.readFileSync('./README.md').toString().split('\n')

const installCommandLine =
  readmeLines.indexOf('<!-- the_installation_command_is_on_the_next_line -->') +
  1

if (installCommandLine === 0) {
  console.error(`Couldn't find sentinel in readme :(`)
  process.exit(1)
}

readmeLines[
  installCommandLine
] = `    curl -s https://raw.githubusercontent.com/artsy/gudetama/${commitHash}/install.sh | source /dev/stdin`

fs.writeFileSync('./README.md', readmeLines.join('\n'))

const circleLines = fs
  .readFileSync('./.circleci/config.yml')
  .toString()
  .split('\n')

const circleInstallCommandLine =
  circleLines.findIndex((s) =>
    s.match(/the_install_command_is_on_the_next_line/)
  ) + 1

const gitCommitHashPartRegexp = /\/[a-f0-9]{40}\//
if (!circleLines[circleInstallCommandLine].match(gitCommitHashPartRegexp)) {
  console.error(`Couldn't find git hash in .circleci/config.yml`)
}
circleLines[circleInstallCommandLine] = circleLines[
  circleInstallCommandLine
].replace(/\/[a-f0-9]{40}\//, `/${commitHash}/`)

fs.writeFileSync('./.circleci/config.yml', circleLines.join('\n'))
