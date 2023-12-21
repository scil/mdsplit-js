var babel = require('@rollup/plugin-babel');

var pkg = require('../package.json');

var version = pkg.version;

var banner = `/*!
 * ${pkg.name} ${version} (https://github.com/scil/mdsplit-js)
 * API https://github.com/scil/mdsplit-js/blob/master/doc/api.md
 * Copyright 2023-${new Date().getFullYear()} scil. All Rights Reserved
 * Licensed under MIT (https://github.com/scil/mdsplit-js/blob/master/LICENSE)
 */
`;

function getCompiler() {
  return babel({
    babelrc: false,
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {
            node: '14',
          },
          modules: false,
          loose: false,
        },
      ],
    ],
    plugins: [
      [
        '@babel/plugin-transform-runtime',
        {
          corejs: 3,
          versions: '^7.23.2',
          helpers: true,
          regenerator: false,
        },
      ],
    ],
    babelHelpers: 'runtime',
    exclude: 'node_modules/**',
  });
}

exports.name = 'mdsplit-js';
exports.banner = banner;
exports.getCompiler = getCompiler;
