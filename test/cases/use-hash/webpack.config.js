import ConcatPlugin from '../../../lib';

module.exports = {
    entry: './index.js',
    plugins: [
        new ConcatPlugin({
            name: 'file',
            fileName: '[name].[hash:20].js',
            filesToConcat: ['../../fixtures/a.js', '../../fixtures/b.js']
        })
    ],
    optimization: {
        minimize: false,
    },
};
