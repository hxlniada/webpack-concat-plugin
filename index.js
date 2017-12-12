/**
 * @file webpack-concat-plugin
 * @author huangxueliang
 */
const fs = require('fs');
const Concat = require('concat-with-sourcemaps');
const UglifyJS = require('uglify-es');
const createHash = require('crypto').createHash;
const path = require('path');
const globby = require('globby');
const validateOptions = require('schema-utils');
const schema = require('./schema.json');

class ConcatPlugin {
    constructor(options) {
        options = Object.assign({
            uglify: false,
            sourceMap: false,
            fileName: '[name].js',
            name: 'result'
        }, options);

        if (!options.filesToConcat) {
            throw new Error('webpackConcatPlugin: option filesToConcat is required');
        }

        validateOptions(schema, options, 'webpackConcatPlugin');

        this.settings = options;

        // used to determine if we should emit files during compiler emit event
        this.startTime = Date.now();
        this.prevTimestamps = {};
        this.needCreateNewFile = true;
    }

    getFileName(files, filePath = this.settings.fileName) {
        if (!this.needCreateNewFile) {
            return this.finalFileName;
        }

        const fileRegExp = /\[name\]/;
        const hashRegExp = /\[hash(?:(?::)([\d]+))?\]/;

        if (this.settings.useHash || hashRegExp.test(filePath)) {
            const fileMd5 = this.md5File(files);

            if (!hashRegExp.test(filePath)) {
                filePath = filePath.replace(/\.js$/, '.[hash].js');
            }

            const regResult = hashRegExp.exec(filePath);
            const hashLength = regResult[1] ? Number(regResult[1]) : 20;

            filePath = filePath.replace(hashRegExp, fileMd5.slice(0, hashLength));
        }
        return filePath.replace(fileRegExp, this.settings.name);
    }

    md5File(files) {
        if (this.fileMd5 && !this.needCreateNewFile) {
            return this.fileMd5;
        }
        const content = Object.keys(files)
            .reduce((fileContent, fileName) => (fileContent + files[fileName]), '');

        this.fileMd5 = createHash('md5').update(content).digest('hex');

        return this.fileMd5;
    }

    resolveReadFiles(compiler) {
        const self = this;
        let readFilePromise;

        const relativePathArrayPromise = Promise.all(this.settings.filesToConcat.map(f => {
            if (globby.hasMagic(f)) {
                return globby(f, {
                    cwd: compiler.options.context,
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

        this.filesToConcatAbsolutePromise = new Promise((resolve, reject) => {
            compiler.plugin('after-resolvers', compiler => {
                resolve(relativePathArrayPromise
                    .then(relativeFilePathArray =>
                        Promise.all(relativeFilePathArray.map(relativeFilePath =>
                            new Promise((resolve, reject) =>
                                compiler.resolvers.normal.resolve(
                                    {},
                                    compiler.options.context,
                                    relativeFilePath,
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
                                        [filePath]: data.toString()
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

        const allFiles = files.reduce((file1, file2) => Object.assign(file1, file2), {});
        let content = '';
        let mapContent = '';

        this.finalFileName = this.getFileName(allFiles);

        if (this.settings.uglify) {
            let options = {};

            if (typeof this.settings.uglify === 'object') {
                options = Object.assign({}, this.settings.uglify, options);
            }

            if (this.settings.sourceMap) {
                options.sourceMap = {
                    filename: `${this.finalFileName.split(path.sep).slice(-1).join(path.sep)}.map`,
                    url: `${this.finalFileName}.map`
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
                content += `//# sourceMappingURL=${this.finalFileName}.map`;
                mapContent = concat.sourceMap;
            }
        }

        compilation.assets[this.finalFileName] = {
            source() {
                return content;
            },
            size() {
                return content.length;
            }
        };

        compilation.applyPlugins('module-asset', {
            userRequest: `${this.settings.name}.js`
        }, this.finalFileName);

        if (this.settings.sourceMap) {
            compilation.assets[`${this.finalFileName}.map`] = {
                source() {
                    return mapContent;
                },
                size() {
                    return mapContent.length;
                }
            };
            compilation.applyPlugins('module-asset', {
                userRequest: `${this.settings.name}.js.map`
            }, `${this.finalFileName}.map`);
        }

        this.needCreateNewFile = false;
    }

    apply(compiler) {

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

        compiler.plugin('compilation', compilation => {

            compilation.plugin('html-webpack-plugin-before-html-generation', (htmlPluginData, callback) => {

                const injectToHtml = () => {
                    htmlPluginData.assets.webpackConcat = htmlPluginData.assets.webpackConcat || {};

                    const relativePath = path.relative(htmlPluginData.outputName, self.finalFileName)
                        .split(path.sep).slice(1).join('/');

                    htmlPluginData.assets.webpackConcat[self.settings.name] = relativePath;
                };

                return self.filesToConcatAbsolutePromise.then(filesToConcatAbsolute => {
                    compilation.fileDependencies.push(...filesToConcatAbsolute);
                    if (!dependenciesChanged(compilation, filesToConcatAbsolute)) {
                        injectToHtml();
                        return callback(null, htmlPluginData);
                    }
                    return self.getReadFilePromise(true).then(files => {
                        self.resolveConcatAndUglify(compilation, files);
                        injectToHtml();

                        callback(null, htmlPluginData);
                    });
                }).catch(e => {
                    console.error(e);
                });
            });
        });
    }
}

module.exports = ConcatPlugin;
