import ConcatPlugin from '../../../lib';

module.exports = {
    entry: './index.js',
    plugins: [
        new ConcatPlugin({
            name: 'file',
            fileName: '[name].js',
            filesToConcat: ['./a.js', './b.js']
        })
    ],
    optimization: {
        minimize: false,
    },
};
