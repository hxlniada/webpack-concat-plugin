/**
 * @file webpack-concat-plugin
 * @author huangxueliang
 */
const fs = require('fs');
const Concat = require('concat-with-sourcemaps');
const UglifyJS = require('uglify-es');
const createHash = require('crypto').createHash;
const path = require('path');
const upath = require('upath');
const globby = require('globby');
const validateOptions = require('schema-utils');
const schema = require('./schema.json');

class ConcatPlugin {
    constructor(options) {
        options = Object.assign({
            uglify: false,
            sourceMap: false,
            fileName: '[name].js',
            name: 'result',
            injectType: 'prepend',
            outputPath: ''
        }, options);

        if (!options.filesToConcat || !options.filesToConcat.length) {
            throw new Error('webpackConcatPlugin: option filesToConcat is required and should not be empty');
        }

        validateOptions(schema, options, 'webpackConcatPlugin');

        options.outputPath = options.outputPath && this.ensureTrailingSlash(options.outputPath);

        this.settings = options;

        // used to determine if we should emit files during compiler emit event
        this.startTime = Date.now();
        this.prevTimestamps = {};
        this.needCreateNewFile = true;
    }

    ensureTrailingSlash(string) {
        if (string.length && string.substr(-1, 1) !== '/') {
            return `${string}/`;
        }

        return string;
    }

    getFileName(files, filePath = this.settings.fileName) {
        if (!this.needCreateNewFile) {
            return this.finalFileName;
        }

        const fileRegExp = /\[name\]/;
        const hashRegExp = /\[hash(?:(?::)([\d]+))?\]/;

        if (this.settings.useHash || hashRegExp.test(filePath)) {
            const fileHash = this.hashFile(files);

            if (!hashRegExp.test(filePath)) {
                filePath = filePath.replace(/\.js$/, '.[hash].js');
            }

            const regResult = hashRegExp.exec(filePath);
            const hashLength = regResult[1] ? Number(regResult[1]) : fileHash.length;

            filePath = filePath.replace(hashRegExp, fileHash.slice(0, hashLength));
        }
        return filePath.replace(fileRegExp, this.settings.name);
    }

    hashFile(files) {
        if (this.fileHash && !this.needCreateNewFile) {
            return this.fileHash;
        }
        const content = Object.keys(files)
            .reduce((fileContent, fileName) => (fileContent + files[fileName]), '');

        const { hashFunction = 'md5', hashDigest = 'hex' } = this.settings;
        this.fileHash = createHash(hashFunction).update(content).digest(hashDigest);
        if (hashDigest === 'base64') {
          // these are not safe url characters.
          this.fileHash = this.fileHash.replace(/[/+=]/g, (c) => {
            switch (c) {
              case '/': return '_';
              case '+': return '-';
              case '=': return '';
              default: return c;
            }
          });
        }

        return this.fileHash;
    }

    getRelativePathAsync(context) {
        return Promise.all(this.settings.filesToConcat.map(f => {
                if (globby.hasMagic(f)) {
                    return globby(f, {
                        cwd: context,
                        nodir: true
                    });
                }
                return f;
            })).then(rawResult =>
                rawResult.reduce((target, resource) => target.concat(resource), [])
            )
            .catch(e => {
                console.error(e);
            });
    }

    resolveReadFiles(compiler) {
        const self = this;
        let readFilePromise;

        const relativePathArrayPromise = this.getRelativePathAsync(compiler.options.context);

        this.filesToConcatAbsolutePromise = new Promise((resolve, reject) => {
            compiler.resolverFactory.plugin('resolver normal', resolver => {
                resolve(relativePathArrayPromise
                    .then(relativeFilePathArray =>
                        Promise.all(relativeFilePathArray.map(relativeFilePath =>
                            new Promise((resolve, reject) =>
                                resolver.resolve(
                                    {},
                                    compiler.options.context,
                                    relativeFilePath,
                                    {},
                                    (err, filePath) => {
                                        if (err) {
                                            reject(err);
                                        }
                                        else {
                                            resolve(filePath);
                                        }
                                    }
                                )
                            )
                        ))
                    ).catch(e => {
                        console.error(e);
                    })
                );
            });
        });

        const createNewPromise = () => {
            self.needCreateNewFile = true;

            return this.filesToConcatAbsolutePromise
                .then(filePathArray =>
                    Promise.all(filePathArray.map(
                        filePath => new Promise((resolve, reject) => {
                            fs.readFile(filePath, (err, data) => {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    resolve({
                                        ['webpack:///' + upath.relative(compiler.options.context, filePath)]: data.toString()
                                    });
                                }
                            });
                        })
                    ))
                ).catch(e => {
                    console.error(e);
                });
        };

        this.getReadFilePromise = createNew => {
            if (!readFilePromise || createNew) {
                readFilePromise = createNewPromise();
            }
            return readFilePromise;
        };
    }

    resolveConcatAndUglify(compilation, files) {
        const allFiles = files.reduce((file1, file2) =>  Object.assign(file1, file2), {});
        let content = '';
        let mapContent = '';

        this.finalFileName = this.getFileName(allFiles);
        const fileBaseName = path.basename(this.finalFileName);

        if (this.settings.uglify) {
            let options = {};

            if (typeof this.settings.uglify === 'object') {
                options = Object.assign({}, this.settings.uglify, options);
            }

            if (this.settings.sourceMap) {
                options.sourceMap = {
                    url: `${fileBaseName}.map`,
                    includeSources: true
                };
            }

            const result = UglifyJS.minify(allFiles, options);

            if (result.error) {
                throw result.error;
            }

            content = result.code;

            if (this.settings.sourceMap) {
                mapContent = result.map.toString();
            }
        }
        else {
            const concat = new Concat(!!this.settings.sourceMap, this.finalFileName, '\n');

            Object.keys(allFiles).forEach(fileName => {
                concat.add(fileName, allFiles[fileName]);
            });

            content = concat.content.toString();

            if (this.settings.sourceMap) {
                content += `//# sourceMappingURL=${fileBaseName}.map`;
                mapContent = concat.sourceMap;
            }
        }

        compilation.assets[`${this.settings.outputPath}${this.finalFileName}`] = {
            source() {
                return content;
            },
            size() {
                return content.length;
            }
        };

        compilation.hooks.moduleAsset.call({
            userRequest: `${this.settings.outputPath}${this.settings.name}.js`
        }, `${this.settings.outputPath}${this.finalFileName}`);

        if (this.settings.sourceMap) {
            compilation.assets[`${this.settings.outputPath}${this.finalFileName}.map`] = {
                source() {
                    return mapContent;
                },
                size() {
                    return mapContent.length;
                }
            };
            compilation.hooks.moduleAsset.call({
                userRequest: `${this.settings.outputPath}${this.settings.name}.js.map`
            }, `${this.settings.outputPath}${this.finalFileName}.map`);
        }

        this.needCreateNewFile = false;
    }

    apply(compiler) {
        // ensure only compile one time per emit
        let compileLoopStarted = false;

        this.resolveReadFiles(compiler);

        const self = this;

        const dependenciesChanged = (compilation, filesToConcatAbsolute) => {
            const fileTimestampsKeys = Object.keys(compilation.fileTimestamps);
            // Since there are no time stamps, assume this is the first run and emit files
            if (!fileTimestampsKeys.length) {
                return true;
            }
            const changed = fileTimestampsKeys.filter(watchfile =>
                (self.prevTimestamps[watchfile] || self.startTime) < (compilation.fileTimestamps[watchfile] || Infinity)
            ).some(f => filesToConcatAbsolute.includes(f));
            this.prevTimestamps = compilation.fileTimestamps;
            return changed;
        };

        const processCompiling = (compilation, callback) => {
            self.filesToConcatAbsolutePromise.then(filesToConcatAbsolute => {
                for (const f of filesToConcatAbsolute) {
                    compilation.fileDependencies.add(path.relative(compiler.options.context, f));
                }
                if (!dependenciesChanged(compilation, filesToConcatAbsolute)) {
                    return callback();
                }
                return self.getReadFilePromise(true).then(files => {
                    self.resolveConcatAndUglify(compilation, files);

                    callback();
                });
            }).catch(e => {
                console.error(e);
            });
        };

        compiler.hooks.compilation.tap('webpackConcatPlugin', compilation => {
            let assetPath;

            compilation.hooks.htmlWebpackPluginBeforeHtmlGeneration
            && compilation.hooks.htmlWebpackPluginBeforeHtmlGeneration.tapAsync('webpackConcatPlugin', (htmlPluginData, callback) => {
                const getAssetPath = () => {
                    if (typeof self.settings.publicPath === 'undefined') {
                        if (typeof compilation.options.output.publicPath === 'undefined') {
                            return path.relative(path.dirname(htmlPluginData.outputName), `${self.settings.outputPath}${self.finalFileName}`);
                        }
                        return `${self.ensureTrailingSlash(compilation.options.output.publicPath)}${self.settings.outputPath}${self.finalFileName}`;
                    }
                    if (self.settings.publicPath === false) {
                        return path.relative(path.dirname(htmlPluginData.outputName), `${self.settings.outputPath}${self.finalFileName}`);
                    }
                    return `${self.ensureTrailingSlash(self.settings.publicPath)}${self.settings.outputPath}${self.finalFileName}`;
                };

                const injectToHtml = () => {
                    htmlPluginData.assets.webpackConcat = htmlPluginData.assets.webpackConcat || {};

                    assetPath = getAssetPath();

                    htmlPluginData.assets.webpackConcat[self.settings.name] = assetPath;

                    if (self.settings.injectType === 'prepend') {
                        htmlPluginData.assets.js.unshift(assetPath);
                    }
                    else if (self.settings.injectType === 'append') {
                        htmlPluginData.assets.js.push(assetPath);
                    }
                };

                if (!self.finalFileName || !compileLoopStarted) {
                    compileLoopStarted = true;
                    processCompiling(compilation, () => {
                        injectToHtml();
                        callback(null, htmlPluginData);
                    });
                }
                else {
                    injectToHtml();
                    callback(null, htmlPluginData);
                }
            });

            compilation.hooks.htmlWebpackPluginAlterAssetTags
            && compilation.hooks.htmlWebpackPluginAlterAssetTags.tap('webpackConcatPlugin', htmlPluginData => {
                if (self.settings.injectType !== 'none') {
                    const tags = htmlPluginData.head.concat(htmlPluginData.body);
                    const resultTag = tags.filter(tag =>
                        tag.attributes.src === assetPath
                    );
                    if (resultTag && resultTag.length && self.settings.attributes) {
                        Object.assign(resultTag[0].attributes, self.settings.attributes);
                    }
                }
            });
        });

        compiler.hooks.emit.tapAsync('webpackConcatPlugin', (compilation, callback) => {
            if (!compileLoopStarted) {
                compileLoopStarted = true;
                processCompiling(compilation, callback);
            }
            else {
                callback();
            }
        });
        compiler.hooks.afterEmit.tap('webpackConcatPlugin', compilation => {
            compileLoopStarted = false;
        });
    }
}

module.exports = ConcatPlugin;
