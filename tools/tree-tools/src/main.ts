import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { GenerateArtifacts } from "./command";

void yargs(hideBin(process.argv))
  .scriptName(String.raw`target`)
  .command(GenerateArtifacts)
  .strictCommands()
  .demandCommand()
  .fail((msg, err, yargs) => {
    console.error(msg, err);
    yargs.help();
    process.exit(1);
  })
  .showHelpOnFail(true)
  .parseAsync();
