set -e

git checkout dist
git checkout master .
yarn build
mv dist/cli.js ./dist.js
git add -f ./dist.js
git add -A
git commit -m "Update app + dist.js [skip ci]"
yarn babel-node scripts/create-install-script.ts
git add -f ./install.sh
git commit -m "Update install script [skip ci]"
git push

install_commit=$(git ref-parse HEAD)

git checkout master
yarn babel-node scripts/update-readme.ts $install_commit
git add README.md
git commit -m "🤖 Update release hash in README [skip-ci]"
git push
