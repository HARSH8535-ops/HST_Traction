import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Install Jest if not available
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!packageJson.devDependencies.jest) {
  console.log('Installing Jest...');
  execSync('npm install --save-dev jest @types/jest ts-jest', { stdio: 'inherit' });
  
  // Update package.json with Jest config
  packageJson.scripts.test = 'jest';
  packageJson.jest = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    testPathIgnorePatterns: ['/node_modules/']
  };
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

console.log('Running tests...');
execSync('npm test -- --run', { stdio: 'inherit' });
