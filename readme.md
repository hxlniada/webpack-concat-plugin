# webpack-concat-plugin
> a plugin to help webpack to concat js and inject to html-webpack-plugin

### install
```
npm install webpack-concat-plugin --save-dev
```

### features
* concat
* uglify when process.env.NODE_ENV === 'production'
* inject to html(with html-webpack-plugin)

### usage
```
const ConcatPlugin = require('webpack-concat-plugin');

new ConcatPlugin({
    useHash: true, // md5 file
    sourceMap: true, // generate sourceMap
    name: 'flexible', // used in html-webpack-plugin
    fileName: 'assets/fm/licai/js/flexible.js',
    filesToConcat: ['./src/lib/flexible.js', './src/lib/makegrid.js']
});

```
### inject to html(by hand)
```
doctype html
...
    script(src=htmlWebpackPlugin.files.webpackConcat.flexible)
...
```

### todo
* add css support
* auto inject to html
