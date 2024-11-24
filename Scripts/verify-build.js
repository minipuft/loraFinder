// scripts/verify-build.js
import fs from 'fs';
import path from 'path';
import logger from '@shared/utils/logger.js'; // Ensure logger is imported

const essentialFiles = [
  'dist/client/index.html',
  'dist/client/main.js',
  'dist/server/entry-server.js',
];

function verifyBuild() {
  console.log('Verifying build output...');

  const missingFiles = essentialFiles.filter(
    (file) => !fs.existsSync(path.resolve(file))
  );

  if (missingFiles.length === 0) {
    console.log('All essential files are present in the build output.');
  } else {
    logger.error(
      'The following essential files are missing from the build output:'
    );
    missingFiles.forEach((file) => logger.error(`- ${file}`));
    process.exit(1);
  }
}

verifyBuild();
