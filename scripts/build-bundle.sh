set -e

yarn rollup --config
version=$(node -e 'console.log(require("./package.json").version)')
filename=gudetama.$version.bundle.js
echo '#!/usr/bin/env node' > $filename
cat dist/cli.js >> $filename
