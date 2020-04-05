set -e

rm -rf test-bin
mkdir test-bin
export PATH=$(echo $PATH:$PWD/test-bin)

# prepare bundle
current_version=$(node -e 'console.log(require("./package.json").version)')
npm version 0.0.0-test --git-tag-version false
yarn build-bundle
npm version $current_version --git-tag-version false

touch test-bin/gudetama-test-bundle
mv gudetama.v0.0.0-test.js test-bin/gudetama-test-bundle
chmod +x test-bin/gudetama-test-bundle

# prepare npm release
yarn build-npm
npm version 0.0.0-test --git-tag-version false
yarn pack
npm version $current_version --git-tag-version false
pushd test-bin
yarn init --yes
yarn add file:../artsy-gudetama-v0.0.0-test.tgz
popd
echo 'node node_modules/.bin/gudetama' > test-bin/gudetama-test-npm
chmod +x test-bin/gudetama-test-npm


node node_modules/.bin/jest "$@"
