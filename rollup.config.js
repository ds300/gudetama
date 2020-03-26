import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'

export default {
  input: 'src/cli.ts',
  output: {
    dir: 'dist',
    format: 'cjs',
  },
  plugins: [typescript(), resolve({ jsnext: true }), commonjs(), json()],
}
