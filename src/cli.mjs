#!/usr/bin/env node
import { ArgumentParser } from 'argparse';
import { MAX_HEADING_LEVEL } from './const.mjs';
import { StdinSplitter, PathBasedSplitter } from './mdsplit.mjs';

const HELP_MSG = `
Split markdown files into chapters at a given heading level.

Each chapter (or subchapter) is written to its own file,
which is named after the heading title.
These files are written to subdirectories representing the document's structure.

Note:
- *Code blocks* (\`\`\`)are detected (and headers inside ignored)
- The output is *guaranteed to be identical* with the input
    (except for the separation into multiple files of course).
    - This means: no touching of whitespace or changing \`-\` to \`*\` of your lists
        like some viusual markdown editors tend to do.
- Text before the first heading is written to a file with the same name as the markdown file.
- Chapters with the same heading name are written to the same file.
- Only ATX headings (such as # Heading 1) are supported.
- Optionally a table of contents (toc.md) can be created.
`;

async function main() {
  const parser = new ArgumentParser({
    description: HELP_MSG,
    add_help: true,
  });

  parser.add_argument('input', {
    nargs: '?',
    help: "path to input file/folder (omit or set to '-' to read from stdin)",
    default: '-',
  });

  parser.add_argument('-e', '--encoding', {
    type: String,
    help: "force a specific encoding, default: python's default platform encoding",
    default: null,
  });

  parser.add_argument('-l', '--max-level', {
    type: Number,
    choices: Array.from({ length: MAX_HEADING_LEVEL }, (_, i) => i + 1),
    help: 'maximum heading level to split, default: %(default)s',
    default: 1,
  });

  parser.add_argument('-t', '--table-of-contents', {
    action: 'store_true',
    help: "generate a table of contents (one 'toc.md' per input file)",
  });

  parser.add_argument('-o', '--output', {
    default: null,
    help: 'path to output folder (must not exist)',
  });

  parser.add_argument('-f', '--force', {
    action: 'store_true',
    help: 'write into output folder even if it already exists',
  });

  parser.add_argument('-v', '--verbose', {
    action: 'store_true',
  });

  const args = parser.parse_args();

  try {
    const splitterArgs = {
      encoding: args.encoding,
      level: args.max_level,
      toc: args.table_of_contents,
      outPath: args.output,
      force: args.force,
      verbose: args.verbose,
    };

    const splitter =
      args.input === '-'
        ? new StdinSplitter(splitterArgs)
        : new PathBasedSplitter(args.input, splitterArgs);

    await splitter.process();
    splitter.printStats();
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
}

main();
