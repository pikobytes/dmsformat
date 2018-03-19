import babel from 'rollup-plugin-babel';
import eslint from 'rollup-plugin-eslint';
import flow from 'rollup-plugin-flow';
import resolve from 'rollup-plugin-node-resolve';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/dmsformat.js',
    format: 'iife',
    name: 'dmsformat',
    sourcemap: 'inline',
  },
  plugins: [
    resolve(),
    eslint(),
    babel()
  ]
};