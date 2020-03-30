
  mkdir -p ~/.gudetama/bin
  echo '#!/usr/bin/env node' > ~/.gudetama/bin/gudetama
  curl https://raw.githubusercontent.com/artsy/gudetama/6fdcfa9ee55aa5d857ba8ea2c462c76689b0f760/dist/cli.js >> ~/.gudetama/bin/gudetama
  chmod +x ~/.gudetama/bin/gudetama
  export PATH=$PATH:~/.gudetama/bin
