set -e

if [ "$CI" = 'true' ]
then
  gudetama run-if-needed prepare-tests
else
  yarn babel-node src/cli run-if-needed prepare-tests
fi

node node_modules/.bin/jest "$@"
