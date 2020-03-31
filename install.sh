
  set -e
  mkdir -p ~/.gudetama/bin
  echo '#!/usr/bin/env node' > ~/.gudetama/bin/gudetama
  curl https://raw.githubusercontent.com/artsy/gudetama/99f9226fdee7acd9535dc80fb0cf61267021111c/dist.js >> ~/.gudetama/bin/gudetama
  chmod +x ~/.gudetama/bin/gudetama
  if [[ -z "$BASH_ENV" ]]
  then
    >&2 echo 'Cannot find BASH_ENV environment variable'
    exit 1
  else
    echo 'export PATH=$PATH:~/.gudetama/bin' >> "$BASH_ENV"
  fi
  echo -e 'gudetama successfuly installed at ~/.gudetama/bin/gudetama'
