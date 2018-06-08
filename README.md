# webpack-concat-plugin

[![Build Status](https://img.shields.io/travis/hxlniada/webpack-concat-plugin.svg)](https://travis-ci.org/hxlniada/webpack-concat-plugin)
[![npm package](https://img.shields.io/npm/v/webpack-concat-plugin.svg)](https://www.npmjs.org/package/webpack-concat-plugin)
[![npm downloads](http://img.shields.io/npm/dm/webpack-concat-plugin.svg)](https://www.npmjs.org/package/webpack-concat-plugin)

> A plugin to help webpack concat js and inject into html

### Why

Webpack is really powerful. However, when I want to concat the static files and inject into html without webpack JSONP code wrapper, it seems impossible to do that without other tool's help.

### Install

```
npm install webpack-concat-plugin --save-dev
```
for webpack >= 4.0
```
npm install webpack-concat-plugin@3.0.0 --save-dev
```

### Features

- Concat
- Inject to html(with html-webpack-plugin)

### Usage

```javascript
const ConcatPlugin = require('webpack-concat-plugin');

new ConcatPlugin({
    ...see options
    // examples
    uglify: false,
    sourceMap: false,
    name: 'result',
    outputPath: 'path/to/output/',
    fileName: '[name].[hash:8].js',
    filesToConcat: ['jquery', './src/lib/**', './dep/dep.js', ['./some/**', '!./some/excludes/**']],
    attributes: {
        async: true
    }
});

```

### Options

#### uglify [boolean | object] default: false
if true the output file will be uglified

or set [uglifyjs](https://github.com/mishoo/UglifyJS2) options to customize the output

#### sourceMap [boolean] default: false
if true, will output sourcemap

#### name [string] default: "result"
it's useful when you want to inject to html-webpack-plugin manully

#### publicPath [string|boolean] default: webpack's publicPath
if set, will be used as the public path of the script tag.

if set to false, will use relativePath.

#### outputPath [string]
if set, will be used as the output directory of the file.

#### fileName [string] default: [name].js
if set, will be used as the output fileName

#### filesToConcat [array] *required*
supported path patterns:
* normal path
* npm packages
* [glob](https://github.com/sindresorhus/globby)

#### injectType ["prepend"|"append"|"none"] default: "prepend"
how to auto inject to html-webpack-plugin(only if html-webpack-plugin set inject option not to be false)

#### attributes [object]
if set, will be used as the extra attributes of the script tag.

### Examples
#### Inject to html by hand

```
doctype html
...
    script(src=htmlWebpackPlugin.files.webpackConcat.flexible)
...
```

### TODO

- [ ] add css support
- [x] auto inject to html
