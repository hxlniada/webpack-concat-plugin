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
            .map(f => path.resolve(f));
    }

    getFileName(files, filePath = this.settings.fileName) {
        const fileRegExp = /\[name\]/;
        const hashRegExp = /\[hash\]/;

        if (this.settings.useHash || hashRegExp.test(filePath)) {
            const fileMd5 = this.md5File(files);

            if (!hashRegExp.test(filePath)) {
                filePath = filePath.replace(/\.js$/, '.[hash].js');
            }
            filePath = filePath.replace(hashRegExp, fileMd5.slice(0, 20));
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
        const concatPromise = () => self.settings.filesToConcat.map(fileName =>
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
                const allFiles = files.reduce((file1, file2) => Object.assign(file1, file2), []);
                self.settings.fileName = self.getFileName(allFiles);

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
                    const allFiles = files.reduce((file1, file2) => Object.assign(file1, file2), []);

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
