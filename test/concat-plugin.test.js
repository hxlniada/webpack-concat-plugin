import ConcatPlugin from '../index';
import path from 'path';

describe('json schema validation', () => {
    it('throws if an incorrect config is passed in', () => {
        expect(() => {
            new ConcatPlugin({filesToConcat: 'test'});
        }).toThrow();
    });

    it('does not throw if filesToConcat is specified', () => {
        expect(() => new ConcatPlugin({filesToConcat: ['./test/fixtures/a.js']})).doesNotThrow;
    });
});

describe('ConcatPlugin', () => {

    it('should get relative path correctly', () => {
        const plugin = new ConcatPlugin({
            filesToConcat: ['./test/fixtures/*.js', 'is-object']
        });

        plugin.getRelativePathAsync(path.resolve(__dirname, '../')).then(relativePaths => {
            expect(relativePaths.length).toEqual(3);
        });
    });

    it('should get hash length correctly', () => {
        const plugin = new ConcatPlugin({
            filesToConcat: ['./test/fixtures/a.js']
        });
        expect(plugin.getFileName('aa', '[name].[hash].js')).toEqual('result.4124bc0a9335c27f086f24ba207a4912.js');
        expect(plugin.getFileName('aa', '[name].[hash:20].js')).toEqual('result.4124bc0a9335c27f086f.js');
        expect(plugin.getFileName('aa', '[name].[hash:8].js')).toEqual('result.4124bc0a.js');
    });

    it('should use specified hash', () => {
        const plugin = new ConcatPlugin({
            filesToConcat: ['./test/fixtures/a.js'],
            hashFunction: 'sha256',
            hashDigest: 'base64'
        });
        expect(plugin.getFileName('aa', '[name].[hash].js')).toEqual('result.lhtt0-3jy47LqsvWjeBAzXjrLtWIkTDM60xJJo6k1QY.js');
    });
});
