/**
 * @file webpack-concat-plugin
 * @author huangxueliang
 * @author mcler
 */
const { Compilation } = require('webpack');
const { ConcatSource, OriginalSource } = require('webpack-sources');
const { createHash } = require('crypto');
const globby = require('globby');
const upath = require('upath');
const validateOptions = require('schema-utils').validate;
const HtmlWebpackPlugin = require('html-webpack-plugin');

const schema = require('./schema.json');
const { createFileWithMap } = require('./file');
const { ensureTrailingSlash } = require('./utils');

const PLUGIN_NAME = 'webpackConcatPlugin';

/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").Compilation} Compilation */
/** @typedef {import("webpack").Context} Context */
/** @typedef {import("webpack").Resolver} Resolver */
/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {Source[]} Sources  */

/**
 * @class ConcatPlugin
 */
class ConcatPlugin {
    constructor(optionsArg) {
        const options = {
            fileName: '[name].js',
            name: 'result',
            injectType: 'prepend',
            outputPath: '',
            ...optionsArg,
        };

        if (!options.filesToConcat || !options.filesToConcat.length) {
            throw new Error(`${PLUGIN_NAME}: option filesToConcat is required and should not be empty`);
        }

        validateOptions(schema, options, PLUGIN_NAME);

        options.outputPath = options.outputPath && ensureTrailingSlash(options.outputPath);

        this.settings = options;

        // used to determine if we should emit files during compiler emit event
        this.startTime = Date.now();
        this.prevTimestamps = {};
        this.needCreateNewFile = true;
        this.resolveCache = {};
    }

    /**
     * @param {string} fileContent
     * @param {string} filePath
     * @returns {string}
     */
    getFileName(fileContent, filePath = this.settings.fileName) {
        if (!this.needCreateNewFile) {
            return this.finalFileName;
        }

        const fileRegExp = /\[name\]/;
        const hashRegExp = /\[hash(?:(?::)([\d]+))?\]/;

        if (this.settings.useHash || hashRegExp.test(filePath)) {
            const fileHash = this.hashFile(fileContent);

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
     * @param {string} fileContent
     * @returns {string}
     */
    hashFile(fileContent) {
        if (this.fileHash && !this.needCreateNewFile) {
            return this.fileHash;
        }

        const { hashFunction = 'md5', hashDigest = 'hex' } = this.settings;

        this.fileHash = createHash(hashFunction).update(fileContent).digest(hashDigest);

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
     * @returns {Promise<string[]>}
     */
    getRelativePathAsync(context) {
        return Promise.all(this.settings.filesToConcat.map((f) => {
            if (globby.hasMagic(f)) {
                return globby(f, {
                    cwd: context,
                    nodir: true,
                });
            }
            return f;
        }))
            .then((raw) => raw.reduce((target, resource) => target.concat(resource), []))
            .catch((error) => {
                console.error(error);
            });
    }

    /**
     * @param {Resolver} resolver
     * @param {string} context
     * @param {string} relativeFilePath
     * @returns {Promise<string>}
     */
    resolveReadFile(resolver, context, relativeFilePath) {
        return new Promise((resolve, reject) => {
            resolver.resolve(
                {},
                context,
                relativeFilePath,
                {},
                (error, filePath) => {
                    if (error) {
                        if (!this.resolveCache[relativeFilePath]) reject(error);
                    } else {
                        this.resolveCache[relativeFilePath] = true;
                        resolve(filePath);
                    }
                },
            );
        });
    }

    /**
     * @param {Compiler} compiler
     */
    resolveReadFiles(compiler) {
        const self = this;

        /**
         * @var {ReturnType<typeof createSourcesPromise>}
         */
        let readFilePromise;

        const relativePathArrayPromise = this.getRelativePathAsync(compiler.options.context);

        /**
         * @var {Promise<Sources>}
        */
        this.filesToConcatAbsolutePromise = new Promise((resolve) => {
            compiler.resolverFactory.hooks.resolver.for('normal').tap('resolver', (resolver) => {
                resolve(relativePathArrayPromise
                    .then((relativeFilePathArray) => Promise.all(
                        relativeFilePathArray.map((relativeFilePath) => this.resolveReadFile(
                            resolver,
                            compiler.options.context,
                            relativeFilePath,
                        )),
                    )).catch((error) => {
                        console.error(error);
                    }));
            });
        });

        /**
         * @returns {Promise<Sources>}
         */
        const createNewPromise = () => {
            self.needCreateNewFile = true;

            return this.filesToConcatAbsolutePromise
                .then((filePathArray) => Promise.allSettled(
                    filePathArray.map((filePath) => createFileWithMap(compiler, filePath)),
                ))
                .then((results) => results.reduce((sources, { value }) => {
                    if (value) sources.push(value);
                    return sources;
                }, []))
                .catch((error) => {
                    console.error(error);
                });
        };

        /**
         * @returns {Promise<Sources>}
         */
        this.getReadFilePromise = (createNew) => {
            if (!readFilePromise || createNew) {
                readFilePromise = createNewPromise();
            }
            return readFilePromise;
        };
    }

    /**
     * @param {Compilation} compilation
     * @param {Sources} sources
     */
    resolveConcatAndUglify(compilation, sources) {
        const concatSource = new ConcatSource();
        sources.forEach((source, idx) => {
            // New line insertion
            if (idx > 0) {
                const prevSourceText = sources[idx - 1].source().toString();
                const currentSourceText = source.source().toString();
                if (prevSourceText.slice(-1) !== '\n'
                    && currentSourceText.slice(0, 1) !== '\n') {
                    concatSource.add(new OriginalSource('\n'));
                }
            }
            concatSource.add(source);
        });
        this.finalFileName = this.getFileName(concatSource.source().toString());
        compilation.emitAsset(
            upath.join(this.settings.outputPath, this.finalFileName),
            concatSource,
        );

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
                (file) => {
                    const start = this.prevTimestamps.get(file) || this.startTime;
                    const end = compilation.fileTimestamps.get(file) || Infinity;
                    return start < end;
                },
            );

            this.prevTimestamps = compilation.fileTimestamps;

            return changedFiles.some((file) => filesToConcatAbsolute.includes(file));
        };

        /**
         * @param {Compilation} compilation
         * @param {Function} callback
         * @returns {void}
         */
        const processCompiling = (compilation, callback) => {
            self.filesToConcatAbsolutePromise.then((filesToConcatAbsolute) => {
                filesToConcatAbsolute.forEach((file) => {
                    compilation.fileDependencies.add(upath.relative(compiler.options.context, file));
                });
                if (!dependenciesChanged(compilation, filesToConcatAbsolute)) {
                    return callback();
                }
                return self.getReadFilePromise(true).then((files) => {
                    self.resolveConcatAndUglify(compilation, files);

                    callback();
                });
            }).catch((error) => {
                console.error(error);
            });
        };

        compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
            let assetPath;
            let hookBeforeAssetTagGeneration = HtmlWebpackPlugin.getHooks(compilation).beforeAssetTagGeneration;

            hookBeforeAssetTagGeneration && hookBeforeAssetTagGeneration.tapAsync(PLUGIN_NAME, (htmlPluginData, callback) => {
                const getAssetPath = () => {
                    if (typeof self.settings.publicPath === 'undefined') {
                        if (typeof htmlPluginData.assets.publicPath === 'undefined') {
                            return upath.relative(upath.dirname(htmlPluginData.outputName), `${self.settings.outputPath}${self.finalFileName}`);
                        }
                        return `${ensureTrailingSlash(htmlPluginData.assets.publicPath)}${self.settings.outputPath}${self.finalFileName}`;
                    }
                    if (self.settings.publicPath === false) {
                        return upath.relative(upath.dirname(htmlPluginData.outputName), `${self.settings.outputPath}${self.finalFileName}`);
                    }
                    return `${ensureTrailingSlash(self.settings.publicPath)}${self.settings.outputPath}${self.finalFileName}`;
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

            const hookAlterAssetTags = HtmlWebpackPlugin.getHooks(compilation).alterAssetTags;

            hookAlterAssetTags && hookAlterAssetTags.tapAsync(PLUGIN_NAME, (htmlPluginData, callback) => {
                if (self.settings.injectType !== 'none') {
                    const tags = htmlPluginData.assetTags.scripts.filter((tag) => tag.attributes.src === assetPath);
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
