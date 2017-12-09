import ConcatPlugin from '../';

describe('ConcatPlugin', () => {
    it('throws if no options are given', () => {
        expect(() => new ConcatPlugin()).toThrow();
    });

    it('should check absolute path for files', () => {
        const plugin = new ConcatPlugin({ filesToConcat: ['./test/fixtures/a.js', './test/fixtures/b.js', 'is-obj'] });
        expect(plugin.filesToConcatAbsolute.length).toEqual(3);
    });
});
