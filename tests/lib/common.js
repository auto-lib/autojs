function fail(msg) {
    console.log('ERROR '+msg);
    process.exit(1);
}

module.exports = { fail }