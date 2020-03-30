import { execSync } from 'child_process'
import fs from 'fs'

const currentCommit = execSync('git rev-parse HEAD').toString().trim()

fs.writeFileSync(
  'install.sh',
  `
  mkdir -p ~/.gudetama/bin
  echo '#!/usr/bin/env node' > ~/.gudetama/bin/gudetama
  curl https://raw.githubusercontent.com/artsy/gudetama/${currentCommit}/dist.js >> ~/.gudetama/bin/gudetama
  chmod +x ~/.gudetama/bin/gudetama
  export PATH=$PATH:~/.gudetama/bin
`,
  { mode: 33261 }
)
