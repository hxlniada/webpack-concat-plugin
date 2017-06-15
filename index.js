/**
 * @file webpack-concat-plugin
 * @author huangxueliang
 */
const fs = require('fs');
const UglifyJS = require('uglify-js');
const md5 = require('md5');
const path = require('path');

class ConcatPlugin {
    constructor(options) {
        this.settings = options;
    }

    getFileName(files, filePath = this.settings.fileName) {
        if (this.settings.useHash) {
            let fileMd5 = this.md5File(files);
            return filePath.replace(/\.js$/, `.${fileMd5.slice(0, 20)}.js`);
        }
        return filePath;
    }

    md5File(files) {
        if (this.fileMd5) {
            return this.fileMd5;
        }
        const content = Object.keys(files).reduce((fileContent, fileName) => (fileContent + files[fileName]), '');
        this.fileMd5 = md5(content);
        return this.fileMd5;
    }

    apply(compiler) {
        const self = this;
        let content = '';
        const concatPromise = self.settings.filesToConcat.map(fileName =>
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

        compiler.plugin('emit', (compilation, callback) => {

            Promise.all(concatPromise).then(files => {
                const allFiles = files.reduce((file1, file2) => Object.assign(file1, file2));

                if (process.env.NODE_ENV === 'production') {
                    self.settings.fileName = self.getFileName(allFiles);

                    let options = {
                        fromString: true
                    };

                    if (self.settings.sourceMap) {
                        options.outSourceMap = `${self.settings.fileName.split(path.sep).slice(-1).join(path.sep)}.map`;
                    }

                    const result = UglifyJS.minify(allFiles, options);
                    const mapContent = result.map.toString();

                    content = result.code;

                    if (self.settings.sourceMap) {
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
                        .reduce((content1, content2) => (content1 + content2), '');
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
                Promise.all(concatPromise).then(files => {
                    const allFiles = files.reduce((file1, file2) => Object.assign(file1, file2));

                    htmlPluginData.assets.webpackConcat = htmlPluginData.assets.webpackConcat || {};

                    const relativePath = path.relative(htmlPluginData.outputName, self.settings.fileName)
                        .split(path.sep).slice(1).join(path.sep);

                    htmlPluginData.assets.webpackConcat[self.settings.name] = self.getFileName(allFiles, relativePath);

                    callback(null, htmlPluginData);
                });
            });
        });
    }
}

module.exports = ConcatPlugin;
