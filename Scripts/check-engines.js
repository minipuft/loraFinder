const { engines } = require('../package.json');
const version = engines.node;
const semver = require('semver');

if (!semver.satisfies(process.version, version)) {
  console.error(
    `Required node version ${version} not satisfied with current version ${process.version}.`
  );
  process.exit(1);
}
