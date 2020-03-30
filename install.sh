
  set -e
  mkdir -p ~/.gudetama/bin
  echo '#!/usr/bin/env node' > ~/.gudetama/bin/gudetama
  curl https://raw.githubusercontent.com/artsy/gudetama/b90b3386dbad10ea220b02d9bd26d2362373461a/dist.js >> ~/.gudetama/bin/gudetama
  chmod +x ~/.gudetama/bin/gudetama
  export PATH=$PATH:~/.gudetama/bin
