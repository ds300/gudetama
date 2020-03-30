
  set -e
  mkdir -p ~/.gudetama/bin
  echo '#!/usr/bin/env node' > ~/.gudetama/bin/gudetama
  curl https://raw.githubusercontent.com/artsy/gudetama/a943bdd66ef13c30d06399c89cca3a735ff5ce2d/dist.js >> ~/.gudetama/bin/gudetama
  chmod +x ~/.gudetama/bin/gudetama
  export PATH=$PATH:~/.gudetama/bin
