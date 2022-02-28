/* eslint-disable comma-dangle, prefer-object-spread, prefer-let/prefer-let, @typescript-eslint/no-unused-expressions */

/**
 * @file webpack-concat-plugin
 * @author huangxueliang
 */
const fs = require('fs');
const Compilation = require('webpack').Compilation;
const { ConcatSource, OriginalSource } = require('webpack-sources');
const createHash = require('crypto').createHash;
const path = require('path');
const upath = require('upath');
const globby = require('globby');
const validateOptions = require('schema-utils').validate;
const schema = require('./schema.json');

const HtmlWebpackPlugin = require('html-webpack-plugin');

const PLUGIN_NAME = 'webpackConcatPlugin';

/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").Compilation} Compilation */
/** @typedef {import("webpack").Context} Context */
/** @typedef {import("webpack-sources").Source} Source */

class ConcatPlugin {
    constructor(options) {
        options = Object.assign({
            fileName: '[name].js',
            name: 'result',
            injectType: 'prepend',
            outputPath: ''
        }, options);

        if (!options.filesToConcat || !options.filesToConcat.length) {
            throw new Error(`${PLUGIN_NAME}: option filesToConcat is required and should not be empty`);
        }

        validateOptions(schema, options, PLUGIN_NAME);

        options.outputPath = options.outputPath && this.ensureTrailingSlash(options.outputPath);

        this.settings = options;

        // used to determine if we should emit files during compiler emit event
        this.startTime = Date.now();
        this.prevTimestamps = {};
        this.needCreateNewFile = true;
        this.resolveCache = {};
    }

    /**
     * @param {string} string
     */
    ensureTrailingSlash(string) {
        if (string.length && string.substr(-1, 1) !== '/') {
            return `${string}/`;
        }

        return string;
    }

    /**
     * @param {Array<string>} files
     * @param {string} filePath
     */
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

    /**
     * @param {Array<string>} files
     */
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

    /**
     * @param {Context} context
     */
    getRelativePathAsync(context) {
        return Promise.all(this.settings.filesToConcat.map(f => {
            if (globby.hasMagic(f)) {
                return globby(f, {
                    cwd: context,
                    nodir: true
                });
            }
            return f;
        }))
            .then(rawResult => rawResult.reduce((target, resource) => target.concat(resource), []))
            .catch(error => {
                console.error(error);
            });
    }

    /**
     * @param {Compiler} compiler
     */
    resolveReadFiles(compiler) {
        const self = this;
        let readFilePromise;

        const relativePathArrayPromise = this.getRelativePathAsync(compiler.options.context);

        this.filesToConcatAbsolutePromise = new Promise((resolve, reject) => {
            compiler.resolverFactory.hooks.resolver.for('normal').tap('resolver', (resolver) => {
                resolve(relativePathArrayPromise
                    .then(relativeFilePathArray =>
                        Promise.all(relativeFilePathArray.map(relativeFilePath =>
                            new Promise((_resolve, _reject) =>
                                resolver.resolve(
                                    {},
                                    compiler.options.context,
                                    relativeFilePath,
                                    {},
                                    (error, filePath) => {
                                        if (error) {
                                            if (!this.resolveCache[relativeFilePath]) _reject(error)
                                        } else {
                                            this.resolveCache[relativeFilePath] = true;
                                            _resolve(filePath);
                                        }
                                    }
                                )
                            )
                        ))
                    ).catch(error => {
                        console.error(error);
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
                                } else {
                                    resolve({
                                        [`webpack:///${upath.relative(compiler.options.context, filePath)}`]: data.toString()
                                    });
                                }
                            });
                        })
                    ))
                ).catch(error => {
                    console.error(error);
                });
        };

        this.getReadFilePromise = createNew => {
            if (!readFilePromise || createNew) {
                readFilePromise = createNewPromise();
            }
            return readFilePromise;
        };
    }

    /**
     * @param {Compilation} compilation
     * @param {Array<any>} files
     */
    resolveConcatAndUglify(compilation, files) {
        const allFiles = files.reduce((file1, file2) => Object.assign(file1, file2), {});

        this.finalFileName = this.getFileName(allFiles);
        const concatSource = new ConcatSource();
        Object.entries(allFiles).forEach(([name, file]) => {
            concatSource.add(new OriginalSource(file, name));
        });
        compilation.emitAsset(`${this.settings.outputPath}/${this.finalFileName}`, concatSource);

        this.needCreateNewFile = false;
    }

    /**
     * @param {Compiler} compiler
     */
    apply(compiler) {
        // ensure only compile one time per emit
        let compileLoopStarted = false;

        this.resolveReadFiles(compiler);

        const self = this;

        const dependenciesChanged = (compilation, filesToConcatAbsolute) => {
            if (!compilation.fileTimestamps) {
                return true;
            }
            const fileTimestampsKeys = Array.from(compilation.fileTimestamps.keys());
            if (!fileTimestampsKeys.length) {
                return true;
            }
            const changedFiles = fileTimestampsKeys.filter(
                file => {
                    const start = this.prevTimestamps.get(file) || this.startTime;
                    const end = compilation.fileTimestamps.get(file) || Infinity;
                    return start < end;
                }
            );

            this.prevTimestamps = compilation.fileTimestamps;

            return changedFiles.some(file => filesToConcatAbsolute.includes(file));
        };

        const processCompiling = (compilation, callback) => {
            self.filesToConcatAbsolutePromise.then(filesToConcatAbsolute => {
                for (const file of filesToConcatAbsolute) {
                    compilation.fileDependencies.add(path.relative(compiler.options.context, file));
                }
                if (!dependenciesChanged(compilation, filesToConcatAbsolute)) {
                    return callback();
                }
                return self.getReadFilePromise(true).then(files => {
                    self.resolveConcatAndUglify(compilation, files);

                    callback();
                });
            }).catch(error => {
                console.error(error);
            });
        };

        compiler.hooks.compilation.tap(PLUGIN_NAME, compilation => {
            let assetPath;
            let hookBeforeAssetTagGeneration = HtmlWebpackPlugin.getHooks(compilation).beforeAssetTagGeneration;

            hookBeforeAssetTagGeneration && hookBeforeAssetTagGeneration.tapAsync(PLUGIN_NAME, (htmlPluginData, callback) => {
                const getAssetPath = () => {
                    if (typeof self.settings.publicPath === 'undefined') {
                        if (typeof htmlPluginData.assets.publicPath === 'undefined') {
                            return path.relative(path.dirname(htmlPluginData.outputName), `${self.settings.outputPath}${self.finalFileName}`);
                        }
                        return `${self.ensureTrailingSlash(htmlPluginData.assets.publicPath)}${self.settings.outputPath}${self.finalFileName}`;
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
                    } else if (self.settings.injectType === 'append') {
                        htmlPluginData.assets.js.push(assetPath);
                    }
                };

                if (!self.finalFileName || !compileLoopStarted) {
                    compileLoopStarted = true;
                    processCompiling(compilation, () => {
                        injectToHtml();
                        callback(null, htmlPluginData);
                    });
                } else {
                    injectToHtml();
                    callback(null, htmlPluginData);
                }
            });

            const hookAlterAssetTags = HtmlWebpackPlugin.getHooks(compilation).alterAssetTags

            hookAlterAssetTags && hookAlterAssetTags.tapAsync(PLUGIN_NAME, (htmlPluginData, callback) => {
                    if (self.settings.injectType !== 'none') {
                        const tags = htmlPluginData.assetTags.scripts.filter(tag => tag.attributes.src === assetPath);
                        if (tags && tags.length && self.settings.attributes) {
                            tags.forEach((tag) => {
                                Object.assign(tag.attributes, self.settings.attributes);
                            });
                        }
                    }
                    callback(null, htmlPluginData);
                });
        });

        compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
            compilation.hooks.processAssets.tapAsync({
                name: PLUGIN_NAME,
                stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
            }, (_, callback) => {
                if (!compileLoopStarted) {
                    compileLoopStarted = true;
                    processCompiling(compilation, callback);
                } else {
                    callback();
                }
            });
        });
        compiler.hooks.afterEmit.tap(PLUGIN_NAME, () => {
            compileLoopStarted = false;
        });
    }
}

module.exports = ConcatPlugin;
