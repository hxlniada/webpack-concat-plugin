/**
 * @param {string} string
 * @returns {string}
 */
function ensureTrailingSlash(string) {
    if (string.length && string.slice(-1) !== '/') {
        return `${string}/`;
    }

    return string;
}

module.exports = { ensureTrailingSlash };
