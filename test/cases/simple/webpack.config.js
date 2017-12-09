import ConcatPlugin from '../../../index';

module.exports = {
    entry: './index.js',
    plugins: [
        new ConcatPlugin({
            name: 'file',
            fileName: '[name].js',
            filesToConcat: ['./test/fixtures/a.js', './test/fixtures/b.js', 'is-object']
        })
    ],
};
