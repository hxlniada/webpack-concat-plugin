## Change History

### v4.1.5 (2022-02-28)
* fixed `outputPath` option usage
* update `babel`, `core-js`, `jest`, `schema-utils`, `webpack`, `webpack-sources`

### v4.1.4 (2021-09-28)
* add `package-lock.json` to repo
* update `babel`, `jest`, `webpack-sources`

### v4.1.3 (2021-04-16)
* downgrade to `globby@^8.0.1` due to issues on Windows

### v4.1.2 (2021-03-30)
* update dependencies, migrate to Babel 7

### v4.1.1 (2021-03-29)
* fixed resolver error

### v4.1.0 (2021-03-26)
* full support for `html-webpack-plugin@5`
* fully passing tests

### v4.0.1 (2020-12-30)
* fixed source map generation

### v4.0.0 (2020-12-08)
* **Breaking change** removed `uglify` and `sourceMap` from plugin configuration
* remove `concat-with-sourcemaps` from dependencies
* support `webpack@5.1.0`
* support `html-webpack-plugin@5.0.0-alpha.15`
* upgrade `schema-utils` to 3.0.0
* `html-webpack-plugin`, `webpack` moved to `peerDependencies`

### v3.0.0 (2018-06-08)
* support webpack4.0.0
* Better hashing. thanks to [ddumont](https://github.com/ddumont)
* Use same location as webpack's other sourcmaps. thanks to [ddumont](https://github.com/ddumont)

### v2.4.2 (2017-12-15)
* upgrade schema-utils to 0.4.3 to show schema errors with a better syntax

### v2.4.1 (2017-12-15)
* fix cannot get source map sources correcly. thanks to [karlAlnebratt](https://github.com/karlAlnebratt)

### v2.4.0 (2017-12-13)
* auto inject to html when html-wepback-plugin inject is not false
* now support publicPath and outputPath
* fix other bugs

### v2.3.0 (2017-12-12)
* filesToConcat now support [glob](https://github.com/sindresorhus/globby) syntax
* add schema
* now use webpack's [enhanced-resolve](https://github.com/webpack/enhanced-resolve) to solve the module path, and the root path is webpack's context path now.
* fix other bugs

#### noted

* due to the way to find modules has changed, you may need to change your path

### v2.2.0 (2017-12-11)
* fix not outputting sourcemaps when `uglify: false`, thanks to [jaketodaro](https://github.com/jaketodaro)

### v2.1.0 (2017-12-10)
* don't need to set manifestName option when use webpack-manifest-plugin
* add support to set hash length

### v2.0.0 (2017-12-09)
* update uglify-js to uglify-es, thanks to [tomastrajan](https://github.com/tomastrajan)
* feat: add integration tests, very thanks to [jiverson](https://github.com/jiverson)
* Fix "Reduce of empty array with no initial value" error, thanks to [akempes](https://github.com/akempes)
* support to call from package name, inspired by [funcphp](https://github.com/funcphp)
* fix [#27](https://github.com/hxlniada/webpack-concat-plugin/issues/27)
* Implement hook from webpack-manifest-plugin 2.0.0-rc.1, fix [#22](https://github.com/hxlniada/webpack-concat-plugin/issues/22)

#### breaking changes
* Remove process.env.NODE_ENV fix [#24](https://github.com/hxlniada/webpack-concat-plugin/issues/24)

### v1.4.2 (2017-10-21)
* fix #19; thanks to [gosp](https://github.com/gosp)

### v1.4.1 (2017-08-31)
* Reload file content on each compiler emit; Fixes #7; thanks to [subhaze](https://github.com/subhaze)
* Fix duplicate hash at generated filename; thanks to [IndraGunawan](https://github.com/IndraGunawan)

### v1.4.0 (2017-08-07)
* Allow passing on Uglify options (#10); thanks to [filipesilva](https://github.com/filipesilva)
* Allow templating fileName (#9); thanks to [filipesilva](https://github.com/filipesilva)

### v1.3.0 (2017-07-07)
* add uglify option

### v1.2.0 (2017-07-03)
* Only re-emit file during watch if a dependency changed; thanks to [subhaze](https://github.com/subhaze)

### v1.1.2 (2017-06-27)
* fix #2

### v1.1.1 (2017-06-17)
* fix #1

### v1.1.0 (2017-06-15)
* refactor using es6

### v1.0.0 (2017-06-15)
* first release
