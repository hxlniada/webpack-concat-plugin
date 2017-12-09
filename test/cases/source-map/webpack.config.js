import ConcatPlugin from '../../../index';
import HtmlWebpackPlugin from 'html-webpack-plugin';

module.exports = {
    entry: './index.js',
    plugins: [
        new ConcatPlugin({
            sourceMap: true,
            name: 'file',
            fileName: '[name].js',
            filesToConcat: ['./test/fixtures/a.js', './test/fixtures/b.js']
        })
    ]
};