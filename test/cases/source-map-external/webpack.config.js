import ConcatPlugin from '../../../lib';

module.exports = {
    entry: './index.js',
    plugins: [
        new ConcatPlugin({
            name: 'file',
            fileName: '[name].js',
            filesToConcat: [
                '../../fixtures/a.js',
                '../../fixtures/b.js',
                '../../fixtures/sourcemaps/external.js'
            ],
        })
    ],
    optimization: {
        minimize: false,
    },
    devtool: 'source-map',
};
