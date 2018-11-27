import ConcatPlugin from '../../../index';
import HtmlWebpackPlugin from 'html-webpack-plugin';

module.exports = {
    entry: './index.js',
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.ejs',
            minify: {
                collapseWhitespace: false,
                removeComments: true,
                removeRedundantAttributes: false,
                removeScriptTypeAttributes: false,
                removeStyleLinkTypeAttributes: false,
                useShortDoctype: false
            }
        }),
        new ConcatPlugin({
            uglify: true,
            sourceMap: true,
            name: 'file',
            fileName: '[name].[hash].js',
            filesToConcat: ['../../fixtures/a.js', '../../fixtures/b.js'],
            attributes: {
                async: true
            }
        }),
    ],
};
