import ConcatPlugin from '../index';

describe('ConcatPlugin', () => {
    it('throws if no options are given', () => {
        expect(() => new ConcatPlugin()).toThrow();
    });

    it('should check absolute path for files', () => {
        const plugin = new ConcatPlugin({ filesToConcat: ['./test/fixtures/a.js', './test/fixtures/b.js', 'is-object'] });
        expect(plugin.filesToConcatAbsolute.length).toEqual(3);
    });
});
