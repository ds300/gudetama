
  set -e
  mkdir -p ~/.gudetama/bin
  echo '#!/usr/bin/env node' > ~/.gudetama/bin/gudetama
  curl https://raw.githubusercontent.com/artsy/gudetama/88bcecd3541290fd9ebf33a7a52d37cb6bdf34a1/dist.js >> ~/.gudetama/bin/gudetama
  chmod +x ~/.gudetama/bin/gudetama
  if [[ -z "$BASH_ENV" ]]
  then
    >&2 echo 'Cannot find BASH_ENV environment variable'
    exit 1
  else
    echo 'export PATH=$PATH:~/.gudetama/bin' >> "$BASH_ENV"
  fi
  echo -e 'gudetama successfuly installed at ~/.gudetama/bin/gudetama'
