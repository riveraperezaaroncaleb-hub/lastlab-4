'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

console.log('>>> [Build] Verificando compilación de SecureVault Enterprise...');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const publicDir = path.join(rootDir, 'securevault', 'public');
const publicIndex = path.join(publicDir, 'index.html');

try {
  if (fs.existsSync(frontendDir)) {
    console.log('>>> [Build] Compilando frontend React con Vite...');
    execSync('npm install --include=dev', { cwd: frontendDir, stdio: 'inherit' });
    execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });

    const distDir = path.join(frontendDir, 'dist');
    if (fs.existsSync(distDir)) {
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.cpSync(distDir, publicDir, { recursive: true });
      console.log('>>> [Build] Bundle de producción de React sincronizado en securevault/public.');
    }
  }
} catch (error) {
  console.warn('>>> [Build Aviso] No se pudo recompilar con Vite:', error.message);
  if (fs.existsSync(publicIndex)) {
    console.log('>>> [Build] Se utilizará la versión precompilada existente en securevault/public.');
  } else {
    throw error;
  }
}

console.log('>>> [Build] Proceso finalizado correctamente.');
