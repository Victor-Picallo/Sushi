import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootEnvLocal = path.resolve(currentDir, '../../../.env.local');
const localEnv = path.resolve(currentDir, '../../.env');

if (fs.existsSync(rootEnvLocal)) {
  dotenv.config({ path: rootEnvLocal });
}
if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
}
