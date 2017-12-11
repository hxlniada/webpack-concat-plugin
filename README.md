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
    uglify: true, // or you can set uglifyjs options
    sourceMap: true, // generate sourceMap
    name: 'flexible', // used in html-webpack-plugin
    fileName: '[name].[hash:8].bundle.js', // would output to 'flexible.d41d8cd9.bundle.js'
    filesToConcat: ['./src/lib/flexible.js', './src/lib/makegrid.js', 'jquery']
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
