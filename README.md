# webpack-concat-plugin
[![npm package](https://img.shields.io/npm/v/webpack-concat-plugin.svg)](https://www.npmjs.org/package/webpack-concat-plugin)
[![npm downloads](http://img.shields.io/npm/dm/webpack-concat-plugin.svg)](https://www.npmjs.org/package/webpack-concat-plugin)
> a plugin to help webpack to concat js and inject to html-webpack-plugin
### Why
webpack is really powerful, but when I just want to concat the static file and inject to html without webpack JSONP code wrapper. After all days search, it seems impossible to do that without other tool's help.

### Install
```
npm install webpack-concat-plugin --save-dev
```

### Features
* concat
* inject to html(with html-webpack-plugin)

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
### Inject to html(by hand)
```
doctype html
...
    script(src=htmlWebpackPlugin.files.webpackConcat.flexible)
...
```

### TODO
* add css support
* auto inject to html
