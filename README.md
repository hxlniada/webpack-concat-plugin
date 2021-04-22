# @mcler/webpack-concat-plugin

[![npm package](https://img.shields.io/npm/v/@mcler/webpack-concat-plugin.svg)](https://www.npmjs.org/package/@mcler/webpack-concat-plugin)

A plugin to concat static JavaScript files and (optionally) inject into HTML without Webpack’ `JSONP` code wrapper. A perfect solution for bundling legacy code.

It delivers:

- Concatination of files
- Source maps
- Minification
- Support for `webpack@5` and `html-webpack-plugin@5`
- Inject to HTML (via [`html-webpack-plugin`](https://github.com/jantimon/html-webpack-plugin))

> Only Webpack 5 is supported

> Forked from [hxlniada’s plugin](https://github.com/hxlniada/webpack-concat-plugin) – supports Webpack 4

## Install

```
npm install @mcler/webpack-concat-plugin --save-dev
```

```
yarn add @mcler/webpack-concat-plugin --dev
```

## Use

```jsx
const ConcatPlugin = require('@mcler/webpack-concat-plugin');
new ConcatPlugin({
  name: 'result',
  outputPath: 'path/to/output/',
  fileName: '[name].[hash:8].js',
  filesToConcat: [
    'jquery',
    './src/lib/**',
    './dep/dep.js',
    [
      './some/**',
      '!./some/excludes/**'
    ]
  ],
  attributes: {
    async: true
  }
});
```

## Minification and Source maps

Key difference of this plugin from [original version](https://github.com/hxlniada/webpack-concat-plugin) is use of Webpack mechanisms for minification and creating source maps.

### `webpack.config.js` mode option

```jsx
module.exports = {
  // skipping full config...
  mode: 'production'
};
```

### `webpack.config.js` detailed configuration

```jsx
module.exports = {
  // skipping full config...
  optimization: {
    minimize: true,
    minimizer: new TerserPlugin(), // or anything you like
  },
  devtool: 'source-map'
};
```

## Options

### `name`

`string = "result"`

Output chunk name.

### `publicPath`

`string | false = webpack.publicPath`

Public path to asset. If `publicPath` is set to `false`, then `relativePath` will be used. `publicPath` will affect script tags:

```jsx
<script src="{publicPath}/{fileName}" />
```

### `outputPath`

`string = ""`

Output directory of the file.

### `fileName`

`string = "[name].js"`

Output file name.

### `filesToConcat` *required*

`string[]`

Array of file paths to concat. Supported path patterns:

- normal path
- npm packages
- [glob](https://github.com/sindresorhus/globby) patterns

### `injectType`

`string = "prepend": "prepend" | "append" | "none"`

How to inject script tags (only works if `html-webpack-plugin` has `inject` option set to `false`)

### `attributes`

`Record<string, boolean | string>`

Extra attributes applied to script tag.

```jsx
{
  async: false,
  defer: true,
  crossorigin: "anonymous"
}
```

## Examples

### Manual inject into HTML

```html
<script src="<%= htmlWebpackPlugin.files.webpackConcat.file %>"></script>
```
