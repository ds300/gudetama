set -e

rm -rf test-bin
mkdir test-bin

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
hash=$(cat artsy-gudetama-v0.0.0-test.tgz | md5)
mv artsy-gudetama-v0.0.0-test.tgz artsy-gudetama-v0.0.0-test.$hash.tgz
npm version $current_version --git-tag-version false
cd test-bin
yarn init --yes
yarn add file:../artsy-gudetama-v0.0.0-test.$hash.tgz
echo "node $PWD/node_modules/.bin/gudetama \"\$@\"" > gudetama-test-npm
cd ../
chmod +x test-bin/gudetama-test-npm
