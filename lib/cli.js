// @ts-check

const { existsSync, mkdirSync } = require('fs')
const { writeCurrentManifest } = require('./manifest/writeCurrentManifest')
const config = require('./config')

function printHelp() {
  console.log(`USAGE

  manifest <command> [...args]

COMMANDS

  should-run <name>
    Returns 0 if the given manifest does not have a previous successful run.

  init
    Initialises the .manifest dir structure if need be.

  generate <name>
    Generates the manifest file with the given name.
`)
}

/**
 * @param manifestName {string}
 */
function renderManifestName(manifestName) {
  return `${gray(':')}${cyan(manifestName)}${gray(':')}`
}

/**
 * @param param0 {string[]}
 */
function run([command, stepName]) {
  switch (command) {
    // case "should-run":
    //   if (!existsSync(join(MANIFESTS_DIR, "current", manifestName))) {
    //     console.error(
    //       `\nERROR: Step ${renderManifestName(
    //         manifestName
    //       )} has no generated manifest. Run 'manifest generate ${manifestName}'.\n`
    //     );
    //     process.exit(1);
    //   }
    //   if (!existsSync(join(MANIFESTS_DIR, "previous", manifestName))) {
    //     console.log(
    //       `\nStep ${renderManifestName(
    //         manifestName
    //       )} has no previous manifest, so it needs to run.\n`
    //     );
    //     process.exit(0);
    //   } else {
    //     writeManifest(manifestName);
    //     const result = compareManifests(manifestName);
    //     if (result.length) {
    //       console.log(
    //         `\nManifest for step ${renderManifestName(
    //           manifestName
    //         )} changed, so it needs to run.\n`
    //       );
    //       console.log(result.join("\n"));
    //       console.log(
    //         `\n${result.length} change${result.length > 1 ? "s" : ""}\n`
    //       );
    //       process.exit(0);
    //     } else {
    //       console.log("NO");
    //       console.log(
    //         `\nManifest for step ${renderManifestName(
    //           manifestName
    //         )} remains unchanged, so it does not need to run.\n`
    //       );
    //       process.exit(0);
    //     }
    //   }
    case 'write-manifest':
      writeCurrentManifest(config, stepName)
      break
    case 'help':
    case '--help':
    case '-h':
      printHelp()
      process.exit(0)
    default:
      printHelp()
      process.exit(1)
  }
}

run(process.argv.slice(2))
