import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { MAX_HEADING_LEVEL, DIR_SUFFIX } from './const.mjs';

const FENCES = ['```', '~~~'];

class Chapter {
  constructor(parentHeadings, heading, text) {
    this.parentHeadings = parentHeadings;
    this.heading = heading;
    this.text = text;
  }
}

class Splitter {
  constructor(encoding, level, toc, force, verbose) {
    this.encoding = encoding || 'utf8';
    this.level = level;
    this.toc = toc;
    this.force = force;
    this.verbose = verbose;
    this.stats = new Stats();
  }

  async process() {
    throw new Error('method not implemented');
  }

  printStats() {
    throw new Error('method not implemented');
  }

  /**
   *
   * It splits the input stream into **chapters** based on the specified heading level. It creates the necessary **directories** for each chapter and writes the chapter content to separate Markdown files. If the `toc` flag is enabled, it also generates a table of contents.
   * @param rl
   * @param fallbackOutFileName
   * @param outPath
   */
  async processStream(rl, fallbackOutFileName, outPath) {
    if (this.verbose) {
      console.log(`Create output folder '${outPath}'`);
    }

    let toc = '# Table of Contents\n';
    this.stats.inFiles += 1;
    const chapters = await splitByHeading(rl, this.level);
    for await (const chapter of chapters) {
      this.stats.chapters += 1;
      let chapterDir = outPath;
      for (const parent of chapter.parentHeadings) {
        chapterDir = path.join(chapterDir, getValidFilename(parent));
      }
      if (
        !fs.existsSync(this.outPath) ||
        !fs.existsSync(chapterDir) ||
        !fs.lstatSync(chapterDir).isDirectory()
      ) {
        fs.mkdirSync(chapterDir, { recursive: true });
      }

      const chapterFilename =
        chapter.heading === null
          ? fallbackOutFileName
          : getValidFilename(chapter.heading.headingTitle) + '.md';

      const chapterPath = path.join(chapterDir, chapterFilename);
      if (this.verbose) {
        console.log(`Write ${chapter.text.length} lines to '${chapterPath}'`);
      }
      if (!fs.existsSync(chapterPath)) {
        this.stats.newOutFiles += 1;
        if (this.toc) {
          const indent = '  '.repeat(chapter.parentHeadings.length);
          const title =
            chapter.heading === null
              ? Splitter.removeMdSuffix(fallbackOutFileName)
              : chapter.heading.headingTitle;
          toc += `\n${indent}- [${title}](<./${path.relative(
            outPath,
            chapterPath,
          )}>)`;
        }
      }

      fs.appendFileSync(
        chapterPath,
        chapter.text.join('\n') + '\n',
        this.encoding,
      );
    }

    if (this.toc) {
      this.stats.newOutFiles += 1;
      const tocPath = path.join(outPath, 'toc.md');
      fs.writeFileSync(tocPath, toc, this.encoding);
      if (this.verbose) {
        console.log(`Write table of contents to ${tocPath}`);
      }
    }
  }

  static removeMdSuffix(filename) {
    if (filename.endsWith('.md')) {
      return filename.slice(0, -3);
    }
    return filename;
  }
}

/**
 * Split content from stdin
 */
export class StdinSplitter extends Splitter {
  constructor({ encoding, level, toc, outPath, force, verbose }) {
    super(encoding, level, toc, force, verbose);
    this.outPath = outPath || DIR_SUFFIX;
    if (
      fs.existsSync(this.outPath) &&
      fs.lstatSync(this.outPath).isDirectory()
    ) {
      if (this.force) {
        console.log(
          `Warning: writing output to existing directory '${this.outPath}'`,
        );
      } else {
        throw new MdSplitError(
          `Output directory '${this.outPath}' already exists. Exiting..`,
        );
      }
    }
  }

  async process() {
    if (this.verbose) {
      console.log('Processing stdin');
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: null,
      terminal: false,
    });

    // const fileContents = fs.readFileSync(filePath, this.encoding);
    // Call the processStream method with the file contents and other parameters
    await this.processStream(rl, 'stdin.md', this.outPath);
  }

  printStats() {
    console.log('Splittig result (from stdin):');
    console.log(`- ${this.stats.chapters} extracted chapter(s)`);
    console.log(
      `- ${this.stats.newOutFiles} new output file(s) (${this.outPath})`,
    );
  }
}

/**
 * Split a specific file or all .md files found in a directory (recursively)
 */
export class PathBasedSplitter extends Splitter {
  constructor(inPath, { encoding, level, toc, outPath, force, verbose }) {
    super(encoding, level, toc, force, verbose);
    this.inPath = inPath;
    if (!fs.existsSync(this.inPath)) {
      throw new MdSplitError(
        `Input file/directory '${this.inPath}' does not exist. Exiting..`,
      );
    } else if (fs.lstatSync(this.inPath).isFile()) {
      this.outPath = outPath || path.parse(this.inPath).name; // get the filename without ext from this.inPath
    } else {
      this.outPath = outPath || path.parse(this.inPath).name + DIR_SUFFIX;
    }
    if (
      fs.existsSync(this.outPath) &&
      fs.lstatSync(this.outPath).isDirectory()
    ) {
      if (force) {
        console.log(
          `Warning: writing output to existing directory '${this.outPath}'`,
        );
      } else {
        throw new MdSplitError(
          `Output directory '${this.outPath}' already exists. Exiting..`,
        );
      }
    }
  }

  async process() {
    if (fs.lstatSync(this.inPath).isFile()) {
      await this.processFile(this.inPath, this.outPath);
    } else {
      await this.processDirectory(this.inPath, this.outPath);
    }
  }

  async processDirectory(inDirPath, outputDirectory) {
    fs.readdirSync(inDirPath).forEach(async (file) => {
      const filePath = path.join(inDirPath, file);
      // only process md files
      if (fs.lstatSync(filePath).isFile() && path.extname(filePath) === '.md') {
        const newOutputPath = path.join(
          outputDirectory,
          path.relative(this.inPath, filePath),
        );
        await this.processFile(filePath, newOutputPath);
      } else if (fs.lstatSync(filePath).isDirectory()) {
        const newOutputDirectory = path.join(
          outputDirectory,
          path.relative(this.inPath, filePath),
        );
        fs.mkdirSync(newOutputDirectory, { recursive: true });
        this.processDirectory(filePath, newOutputDirectory);
      }
    });
  }

  async processFile(filePath, outputPath) {
    if (this.verbose) {
      console.log(`Processing file: ${filePath}`);
    }

    const fileStream = fs.createReadStream(filePath);

    const rl = readline.createInterface({
      input: fileStream,
      // Note: we use the crlfDelay option to recognize all instances of CR LF
      // ('\r\n') in input.txt as a single line break.
      crlfDelay: Infinity,
    });

    // const fileContents = fs.readFileSync(filePath, this.encoding);
    // Call the processStream method with the file contents and other parameters
    await this.processStream(rl, path.basename(filePath), outputPath);
  }

  printStats() {
    console.log(`Number of input files: ${this.stats.inFiles}`);
    console.log(`Number of extracted chapters: ${this.stats.chapters}`);
    console.log(`Number of new output files: ${this.stats.newOutFiles}`);
  }
}

async function* splitByHeading(rl, maxLevel) {
  let currParentHeadings = new Array(MAX_HEADING_LEVEL).fill(null);
  let currHeadingLine = null;
  let currLines = [];
  let withinFence = false;

  for await (let nextLine of rl) {
    nextLine = new Line(nextLine);

    if (nextLine.isFence()) {
      withinFence = !withinFence;
    }

    const isChapterFinished =
      !withinFence && nextLine.isHeading() && nextLine.headingLevel <= maxLevel;

    if (isChapterFinished) {
      if (currLines.length > 0) {
        const parents = __getParents(currParentHeadings, currHeadingLine);
        yield new Chapter(parents, currHeadingLine, currLines);

        if (currHeadingLine !== null) {
          const currLevel = currHeadingLine.headingLevel;
          currParentHeadings[currLevel - 1] = currHeadingLine.headingTitle;
          for (let level = currLevel; level < MAX_HEADING_LEVEL; level++) {
            currParentHeadings[level] = null;
          }
        }
      }

      currHeadingLine = nextLine;
      currLines = [];
    }

    currLines.push(nextLine.fullLine);
  }

  const parents = __getParents(currParentHeadings, currHeadingLine);
  //  yields the last chapter
  yield new Chapter(parents, currHeadingLine, currLines);
}

function __getParents(parentHeadings, headingLine) {
  if (headingLine === null) {
    return [];
  }

  const maxLevel = headingLine.headingLevel;
  const trunc = parentHeadings.slice(0, maxLevel - 1);
  return trunc.filter((h) => h !== null);
}

/**
 *
 Detect code blocks and ATX headings.

 Headings are detected according to commonmark, e.g.:
 - only 6 valid levels
 - up to three spaces before the first # is ok
 - empty heading is valid
 - closing hashes are stripped
 - whitespace around title are stripped
 */
class Line {
  constructor(line) {
    this.fullLine = line;
    this._detectHeading(line);
  }

  _detectHeading(line) {
    this.headingLevel = 0;
    this.headingTitle = null;
    const result = line.match(/^[ ]{0,3}(#+)(.*)/);
    if (result !== null && result[1].length <= MAX_HEADING_LEVEL) {
      const title = result[2];
      if (
        title.length > 0 &&
        !title.startsWith(' ') &&
        !title.startsWith('\t')
      ) {
        // if there is a title it must start with space or tab
        return;
      }
      this.headingLevel = result[1].length;

      // strip whitespace and closing hashes
      this.headingTitle = title.trim().replace(/#+$/, '').trim();
    }
  }

  isFence() {
    for (const fence of FENCES) {
      if (this.fullLine.startsWith(fence)) {
        return true;
      }
    }
    return false;
  }

  isHeading() {
    return this.headingLevel > 0;
  }
}

class MdSplitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MdSplitError';
  }
}

class Stats {
  constructor(inFiles = 0, newOutFiles = 0, chapters = 0) {
    this.inFiles = inFiles;
    this.newOutFiles = newOutFiles;
    this.chapters = chapters;
  }
}

function getValidFilename(name) {
  let s = String(name).trim();
  // Uses a regular expression to remove any characters that are not alphanumeric, hyphen, period, or space.
  // s = s.replace(/[^-\w. ]/gu, "");
  // use \p{L}, to keep any kind of letter from any language
  s = s.replace(/[^-\w\p{L}. ]/gu, '');
  if (s === '' || s === '.' || s === '..') {
    throw new Error(`Could not derive file name from '${name}'`);
  }
  return s;
}
