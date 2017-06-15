var fs = require('fs');
var UglifyJS = require('uglify-js');
var md5 = require('md5');
var path = require('path');

function ConcatPlugin(options) {
    this.settings = options;
}

ConcatPlugin.prototype.getFileName = function (files, filePath) {
    if (this.settings.useHash) {
        var fileMd5 = this.md5File(files);
        return (filePath || this.settings.fileName).replace(/\.js$/, '.' + fileMd5.slice(0, 20) + '.js');
    }
    return filePath || this.settings.fileName;
};

ConcatPlugin.prototype.md5File = function (files) {
    if (this.fileMd5) {
        return this.fileMd5;
    }
    var content = Object.keys(files).reduce(function (fileContent, fileName) {
        return fileContent + files[fileName];
    }, '');
    this.fileMd5 = md5(content);
    return this.fileMd5;
};

ConcatPlugin.prototype.apply = function (compiler) {
    var self = this;
    var content = '';
    var concatPromise = self.settings.filesToConcat.map(function (fileName) {
        return new Promise(function (resolve, reject) {
            fs.readFile(fileName, function (err, data) {
                if (err) {
                    throw err;
                }
                resolve({
                    [fileName]: data.toString()
                });
            });
        });
    });

    compiler.plugin('emit', function (compilation, callback) {

        Promise.all(concatPromise).then(function (files) {
            var allFiles = files.reduce(function (file1, file2) {
                return Object.assign(file1, file2);
            });

            if (process.env.NODE_ENV === 'production') {
                self.settings.fileName = self.getFileName(allFiles);

                var options = {
                    fromString: true
                };

                if (self.settings.sourceMap) {
                    options.outSourceMap = self.settings.fileName.split(path.sep).slice(-1).join(path.sep) + '.map';
                }

                var result = UglifyJS.minify(allFiles, options);
                var mapContent = result.map.toString();

                content = result.code;

                if (self.settings.sourceMap) {
                    compilation.assets[self.settings.fileName + '.map'] = {
                        source: function () {
                            return mapContent;
                        },
                        size: function () {
                            return mapContent.length;
                        }
                    };
                }
            }
            else {
                content = Object.keys(allFiles).map(function (fileName) {
                    return allFiles[fileName];
                }).reduce(function (content1, content2) {
                    return content1 + content2;
                }, '');
            }

            compilation.assets[self.settings.fileName] = {
                source: function () {
                    return content;
                },
                size: function () {
                    return content.length;
                }
            };

            callback();
        });
    });

    compiler.plugin('compilation', function (compilation) {
        compilation.plugin('html-webpack-plugin-before-html-generation', function (htmlPluginData, callback) {
            Promise.all(concatPromise).then(function (files) {
                var allFiles = files.reduce(function (file1, file2) {
                    return Object.assign(file1, file2);
                });

                htmlPluginData.assets.webpackConcat = htmlPluginData.assets.webpackConcat || {};

                var relativePath = path.relative(htmlPluginData.outputName, self.settings.fileName).split(path.sep).slice(1).join(path.sep);

                htmlPluginData.assets.webpackConcat[self.settings.name] = self.getFileName(allFiles, relativePath);

                callback(null, htmlPluginData);
            });
        });
    });
};

module.exports = ConcatPlugin;
