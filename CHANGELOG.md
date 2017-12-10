## Change History
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

## breaking changes
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
