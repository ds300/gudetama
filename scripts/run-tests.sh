set -e

if [ "$CI" = 'true' ]
then
  gudetama run-if-needed prepare-tests --silent
else
  yarn babel-node src/cli run-if-needed prepare-tests --silent
fi

export PATH=$(echo $PATH:$PWD/test-bin)
node node_modules/.bin/jest "$@"
