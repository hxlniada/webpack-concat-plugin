/**
 * @file webpack-concat-plugin
 * @author huangxueliang
 */
const fs = require('fs');
const UglifyJS = require('uglify-es');
const createHash = require('crypto').createHash;
const path = require('path');

class ConcatPlugin {
    constructor(options) {
        this.settings = options;

        // used to determine if we should emit files during compiler emit event
        this.startTime = Date.now();
        this.prevTimestamps = {};

        this.filesToConcatAbsolute = options.filesToConcat
            .map(f => {
                let tempPath = path.resolve(f);
                let realPath;
                try {
                    realPath = require.resolve(tempPath);
                }
                catch (e) {
                    try {
                        realPath = require.resolve(f);
                    }
                    catch (e) {
                        console.error(e);
                    }
                }
                return realPath;
            });
    }

    getFileName(files, filePath = this.settings.fileName) {
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
        if (this.fileMd5) {
            return this.fileMd5;
        }
        const content = Object.keys(files)
            .reduce((fileContent, fileName) => (fileContent + files[fileName]), '');


        this.fileMd5 = createHash('md5').update(content).digest('hex');
        return this.fileMd5;
    }

    apply(compiler) {
        const self = this;
        let content = '';

        const concatPromise = () => self.filesToConcatAbsolute.map(fileName =>
            new Promise((resolve, reject) => {
                fs.readFile(fileName, (err, data) => {
                    if (err) {
                        throw err;
                    }
                    resolve({
                        [fileName]: data.toString()
                    });
                });
            })
        );
        const dependenciesChanged = compilation => {
            const fileTimestampsKeys = Object.keys(compilation.fileTimestamps);
            // Since there are no time stamps, assume this is the first run and emit files
            if (!fileTimestampsKeys.length) {
                return true;
            }
            const changed = fileTimestampsKeys.filter(watchfile =>
                (self.prevTimestamps[watchfile] || self.startTime) < (compilation.fileTimestamps[watchfile] || Infinity)
            ).some(f => self.filesToConcatAbsolute.includes(f));
            this.prevTimestamps = compilation.fileTimestamps;
            return changed;
        };

        compiler.plugin('emit', (compilation, callback) => {

            compilation.fileDependencies.push(...self.filesToConcatAbsolute);
            if (!dependenciesChanged(compilation)) {
                return callback();
            }

            Promise.all(concatPromise()).then(files => {
                const allFiles = files.reduce((file1, file2) => Object.assign(file1, file2), {});
                self.settings.fileName = self.getFileName(allFiles);

                compilation.applyPlugins('module-asset', {
                    userRequest: `${self.settings.name}.js`
                }, self.settings.fileName);

                if (self.settings.uglify) {
                    let options = {};

                    if (typeof self.settings.uglify === 'object') {
                        options = Object.assign({}, self.settings.uglify, options);
                    }

                    if (self.settings.sourceMap) {
                        options.sourceMap = {
                            filename: `${self.settings.fileName.split(path.sep).slice(-1).join(path.sep)}.map`,
                            url: `${self.settings.fileName}.map`
                        };
                    }

                    const result = UglifyJS.minify(allFiles, options);

                    if (result.error) {
                        throw result.error;
                    }

                    content = result.code;

                    if (self.settings.sourceMap) {
                        const mapContent = result.map.toString();
                        compilation.assets[`${self.settings.fileName}.map`] = {
                            source() {
                                return mapContent;
                            },
                            size() {
                                return mapContent.length;
                            }
                        };
                        compilation.applyPlugins('module-asset', {
                            userRequest: `${self.settings.name}.js.map`
                        }, `${self.settings.fileName}.map`);
                    }
                }
                else {
                    content = Object.keys(allFiles)
                        .map(fileName => allFiles[fileName])
                        .reduce((content1, content2) => (`${content1}\n${content2}`), '');
                }

                compilation.assets[self.settings.fileName] = {
                    source() {
                        return content;
                    },
                    size() {
                        return content.length;
                    }
                };

                callback();
            });
        });

        compiler.plugin('compilation', compilation => {

            compilation.plugin('html-webpack-plugin-before-html-generation', (htmlPluginData, callback) => {
                Promise.all(concatPromise()).then(files => {
                    const allFiles = files.reduce((file1, file2) => Object.assign(file1, file2), {});

                    htmlPluginData.assets.webpackConcat = htmlPluginData.assets.webpackConcat || {};

                    const relativePath = path.relative(htmlPluginData.outputName, self.settings.fileName)
                        .split(path.sep).slice(1).join('/');

                    htmlPluginData.assets.webpackConcat[self.settings.name] = self.getFileName(allFiles, relativePath);

                    callback(null, htmlPluginData);
                });
            });
        });
    }
}

module.exports = ConcatPlugin;
