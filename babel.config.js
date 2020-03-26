module.exports = function (api) {
  api.cache.forever()
  return {
    plugins: [
      ['@babel/plugin-transform-runtime'],
      ['@babel/plugin-proposal-class-properties', { loose: true }],
    ],
    presets: [
      '@babel/preset-typescript',
      [
        '@babel/preset-env',
        {
          targets: {
            node: true,
          },
        },
      ],
    ],
  }
}
