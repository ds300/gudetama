set -e

if ! git checkout dist
then
  git checkout -b dist
else
  git checkout master .
fi
yarn build
mv dist/cli.js ./dist.js
git add -f ./dist.js
git add -A
git commit -m "Update app + dist.js [skip ci]"
yarn babel-node scripts/create-install-script.ts
git add -f ./install.sh
git commit -m "Update install script [skip ci]"
if ! git push
then
  git push --set-upstream origin dist
fi

install_commit=$(git rev-parse HEAD)

git checkout master
yarn babel-node scripts/update-readme.ts $install_commit
git add README.md
git commit -m "🤖 Update release hash in README [skip-ci]"
git push
