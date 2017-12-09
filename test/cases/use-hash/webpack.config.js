import ConcatPlugin from '../../../index';
import HtmlWebpackPlugin from 'html-webpack-plugin';

module.exports = {
    entry: './index.js',
    plugins: [
        new ConcatPlugin({
            useHash: true,
            name: 'file',
            fileName: '[name].[hash].js',
            filesToConcat: ['./test/fixtures/a.js', './test/fixtures/b.js']
        })
    ]
};