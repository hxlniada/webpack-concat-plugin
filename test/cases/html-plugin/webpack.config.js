import ConcatPlugin from '../../../lib';
import HtmlWebpackPlugin from 'html-webpack-plugin';

module.exports = {
    entry: './index.js',
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.ejs',
            minify: false,
            scriptLoading: 'blocking',
        }),
        new ConcatPlugin({
            name: 'file',
            fileName: '[name].[hash:20].js',
            injectType: 'none',
            filesToConcat: ['../../fixtures/a.js', '../../fixtures/b.js']
        }),
    ],
    devtool: 'source-map',
};
