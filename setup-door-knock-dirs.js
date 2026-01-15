// Node.js script to create door-knocking directories
const fs = require('fs');
const path = require('path');

const baseDir = __dirname;

const directories = [
  path.join(baseDir, 'components', 'admin', 'door-knocking'),
  path.join(baseDir, 'app', '(admin)', 'admin', 'door-knocking'),
  path.join(baseDir, 'app', '(admin)', 'admin', 'door-knocking', 'analytics'),
];

console.log('Creating directories for door-knocking feature...\n');

directories.forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✓ Created: ${dir}`);
    } else {
      console.log(`• Already exists: ${dir}`);
    }
  } catch (error) {
    console.error(`✗ Error creating ${dir}:`, error.message);
  }
});

console.log('\n✓ Directory structure setup complete!');
