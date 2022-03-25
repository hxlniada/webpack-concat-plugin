const esbuild = require('esbuild');
const pkg = require('./package.json');

// Exclude node_modules from output bundle
const external = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
];

const outputs = [
    { format: 'esm', outfile: 'dist/index.mjs' },
    { format: 'cjs', outfile: 'dist/index.js' },
];

outputs.forEach((outputItem) => {
    esbuild.build({
        bundle: true,
        entryPoints: ['lib/index.js'],
        external,
        minify: true,
        platform: 'node',
        sourcemap: false,
        target: ['node10'],
        treeShaking: true,
        ...outputItem,
    });
});
