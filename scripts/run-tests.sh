set -e

yarn babel-node src/cli run-if-needed prepare-tests

export PATH=$(echo $PWD/test-bin:$PATH)
node node_modules/.bin/jest "$@"
