set -e
mkdir -p ~/.gudetama/bin
curl -s -L https://github.com/artsy/gudetama/releases/download/v1.0.0-24/gudetama.v1.0.0-24.js > ~/.gudetama/bin/gudetama
chmod +x ~/.gudetama/bin/gudetama
if [[ -z "$BASH_ENV" ]]
then
  export PATH=$PATH:~/.gudetama/bin
else
  echo 'export PATH=$PATH:~/.gudetama/bin' >> "$BASH_ENV"
fi
echo -e 'gudetama successfuly installed at ~/.gudetama/bin/gudetama'
