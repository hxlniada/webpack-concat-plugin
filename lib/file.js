const fs = require('fs/promises');
const upath = require('upath');
const { OriginalSource, SourceMapSource } = require('webpack-sources');

/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").Compilation} Compilation */
/** @typedef {import("webpack").Context} Context */
/** @typedef {import("webpack-sources").Source} Source */

/**
 * @param {string} filePath
 * @returns {Promise<string | undefined>}
 */
function readFile(filePath) {
    return fs.readFile(filePath)
        .then(
            (file) => file.toString(),
            () => undefined,
        )
        .catch(() => undefined);
}

/**
 * @param {string} filePath
 * @returns {Promise<{ source: string; map: string | undefined }>}
 */
async function getSourceAndMap(filePath) {
    let source = await readFile(filePath);

    if (!source) return Promise.reject();

    let map;
    let sourceMapping;
    const regexp = /\/\/# sourceMappingURL=(data:application\/json;base64,)?(.+)\n/;

    const matches = regexp.exec(source) ?? [];

    const [sourceMappingLine, isBase64, sourceMappingUrl] = matches;
    if (isBase64) {
        sourceMapping = Buffer.from(sourceMappingUrl, 'base64');
    } else if (sourceMappingUrl) {
        sourceMapping = await readFile(`${upath.dirname(filePath)}/${sourceMappingUrl}`);
    } else {
        sourceMapping = await readFile(`${filePath}.map`);
    }

    if (sourceMapping) map = JSON.parse(sourceMapping);

    if (sourceMappingLine) {
        source = source.replace(sourceMappingLine, '');
    }

    return { source, map };
}

/**
 * @param {Compiler} compiler
 * @param {string} filePath
 * @returns {Promise<Source>}
 */
function createFileWithMap(compiler, filePath) {
    const webpackPath = `webpack:///${upath.relative(compiler.options.context, filePath)}`;

    return getSourceAndMap(filePath)
        .then(
            ({ source, map }) => (map
                ? new SourceMapSource(source, webpackPath, map)
                : new OriginalSource(source, webpackPath)),
            () => Promise.reject(),
        )
        .catch((error) => {
            console.debug(error);

            return Promise.reject();
        });
}

module.exports = { createFileWithMap };
