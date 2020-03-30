
  set -e
  mkdir -p ~/.gudetama/bin
  echo '#!/usr/bin/env node' > ~/.gudetama/bin/gudetama
  curl https://raw.githubusercontent.com/artsy/gudetama/ba650d993dc2bd77672c918abb506abe3fd42d60/dist.js >> ~/.gudetama/bin/gudetama
  chmod +x ~/.gudetama/bin/gudetama
  export PATH=$PATH:~/.gudetama/bin
