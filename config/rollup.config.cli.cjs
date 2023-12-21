// rollup.config.js
// commonjs
var terser = require('@rollup/plugin-terser');
var common = require('./rollup.cjs');

module.exports = {
  input: 'src/cli.mjs',
  output: [
    {
      file: 'dist/bin/mdsplit.js',
      format: 'cjs',
      // When export and export default are not used at the same time, set legacy to true.
      // legacy: true,
      banner: common.banner,
      sourcemap: true,
    },
  ],
  plugins: [
    // common.getCompiler(),
    terser(),
  ],
};
