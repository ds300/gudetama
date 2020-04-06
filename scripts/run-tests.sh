set -e

yarn babel-node src/cli run-if-needed prepare-tests --silent

echo ''
echo '$ jest' "$@"
echo ''
node node_modules/.bin/jest "$@"
