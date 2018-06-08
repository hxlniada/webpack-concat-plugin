import ConcatPlugin from '../../../index';
import HtmlWebpackPlugin from 'html-webpack-plugin';

module.exports = {
    entry: './index.js',
    plugins: [
        new HtmlWebpackPlugin({ template: './index.ejs' }),
        new ConcatPlugin({
            uglify: true,
            sourceMap: true,
            name: 'file',
            fileName: '[name].[hash:20].js',
            filesToConcat: ['../../fixtures/a.js', '../../fixtures/b.js'],
            attributes: {
                async: true
            }
        }),
    ],
};
