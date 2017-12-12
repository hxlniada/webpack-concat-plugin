import ConcatPlugin from '../../../index';
import HtmlWebpackPlugin from 'html-webpack-plugin';

module.exports = {
    entry: './index.js',
    plugins: [
        new ConcatPlugin({
            uglify: true,
            name: 'file',
            fileName: '[name].js',
            filesToConcat: ['../../fixtures/a.js', '../../fixtures/b.js']
        })
    ]
};
