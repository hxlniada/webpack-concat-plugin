import ConcatPlugin from '../index';

describe('ConcatPlugin', () => {
    it('throws if no options are given', () => {
        expect(() => new ConcatPlugin()).toThrow();
    });

    it('should check absolute path for files', () => {
        const plugin = new ConcatPlugin({
            filesToConcat: ['./test/fixtures/a.js', './test/fixtures/b.js', 'is-object']
        });
        expect(plugin.filesToConcatAbsolute.length).toEqual(3);
    });

    it('should get hash length correct', () => {
        const plugin = new ConcatPlugin({
            name: 'test',
            filesToConcat: []
        });
        expect(plugin.getFileName('aa', '[name].[hash].js')).toEqual('test.4124bc0a9335c27f086f.js');
        expect(plugin.getFileName('aa', '[name].[hash:8].js')).toEqual('test.4124bc0a.js');
    });
});
