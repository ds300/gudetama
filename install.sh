
  set -e
  mkdir -p ~/.gudetama/bin
  echo '#!/usr/bin/env node' > ~/.gudetama/bin/gudetama
  curl https://raw.githubusercontent.com/artsy/gudetama/97eda60e59d85c043ea30f24556c68509f64e0ec/dist.js >> ~/.gudetama/bin/gudetama
  chmod +x ~/.gudetama/bin/gudetama
  export PATH=$PATH:~/.gudetama/bin
