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

### Features

- Concat
- Inject to html(with html-webpack-plugin)

### Usage

```
const ConcatPlugin = require('webpack-concat-plugin');

new ConcatPlugin({
    // can set uglifyjs3 options, default to false
    uglify: true,
    // generate sourceMap, default to false
    sourceMap: true,
    // used in html-webpack-plugin, default to 'result'
    name: 'flexible',
    // default to [name].js
    fileName: '/path/to/[name].[hash:8].bundle.js',
    // support normal path, npm packages, or glob pattern: https://github.com/sindresorhus/globby
    filesToConcat: ['./src/lib/flexible.js', './src/lib/makegrid.js', 'jquery', './src/dep/**', ['./test/**', '!./test/exclude/**']]
});

```

### Inject to html (by hand)

```
doctype html
...
    script(src=htmlWebpackPlugin.files.webpackConcat.flexible)
...
```

### TODO

- [ ] add css support
- [ ] auto inject to html
