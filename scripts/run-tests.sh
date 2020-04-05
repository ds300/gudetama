set -e

if [ "$CI" = 'true' ]
then
  gudetama run-if-needed prepare-tests --silent
else
  yarn babel-node src/cli run-if-needed prepare-tests --silent
fi

node node_modules/.bin/jest "$@"
