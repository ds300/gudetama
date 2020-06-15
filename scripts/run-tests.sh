set -e

# use self to avoid rebundling when we only changed test files
yarn babel-node src/cli run-if-needed prepare-tests --silent

echo ''
echo '$ jest' "$@"
echo ''
node node_modules/.bin/jest "$@"
