# [mdsplit-js](https://github.com/scil/mdsplit-js)
[![](https://img.shields.io/badge/Powered%20by-jslib%20base-brightgreen.svg)](https://github.com/yanhaijing/jslib-base)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/scil/mdsplit-js/blob/master/LICENSE)
[![CI](https://github.com/scil/mdsplit-js/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/scil/mdsplit-js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/badge/npm-0.1.0-orange.svg)](https://www.npmjs.com/package/mdsplit-js)
[![NPM downloads](http://img.shields.io/npm/dm/mdsplit-js.svg?style=flat-square)](http://www.npmtrends.com/mdsplit-js)
[![Percentage of issues still open](http://isitmaintained.com/badge/open/scil/mdsplit-js.svg)](http://isitmaintained.com/project/scil/mdsplit-js "Percentage of issues still open")

js port of python [markusstraub/mdsplit](https://github.com/markusstraub/mdsplit)

## Extra Features

1. customize the file name for each chapter (each head represents a chapter). Index can be added to file name
```bash
-cf "return `${chapter.index}-${( chapter.heading?  chapter.heading.headingTitle:  fallback )}`  " -o output_dir  "big.md" 
 ```

2. new treatment method for the text contents under a header which has sub headers
```markdown
# h1

history

## h2
```
by default, this markdown file would be split into 
```
- h1.md
- h1
  - h2.md
```
but with the extra cli option `-eq`, the output is
```
- h1
  - h1.md
  - h2.md
```
with both options `-eq` and `-cf` 
```bash
-eq -cf "return `${chapter.index}-${( chapter.heading?  chapter.heading.headingTitle:  fallback )}`  "  -l 2 -o output_dir "big.md" 
```
the output could be
```
- 0-h1
  - 0-h1.md
  - 1-h2.md
```
