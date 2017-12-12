import ConcatPlugin from '../../../index';
import HtmlWebpackPlugin from 'html-webpack-plugin';

module.exports = {
    entry: './index.js',
    plugins: [
        new ConcatPlugin({
            name: 'file',
            fileName: '[name].[hash].js',
            filesToConcat: ['../../fixtures/a.js', '../../fixtures/b.js']
        })
    ]
};
