'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

console.log('>>> [Build] Compilando SecureVault Enterprise Fullstack...');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const publicDir = path.join(rootDir, 'securevault', 'public');

// Si existe la carpeta frontend, compilar React y sincronizar con public
if (fs.existsSync(frontendDir)) {
  console.log('>>> [Build] Instalando dependencias del frontend React...');
  execSync('npm install', { cwd: frontendDir, stdio: 'inherit' });

  console.log('>>> [Build] Compilando bundle de producción con Vite...');
  execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });

  const distDir = path.join(frontendDir, 'dist');
  if (fs.existsSync(distDir)) {
    console.log('>>> [Build] Sincronizando frontend compilado en securevault/public...');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    fs.cpSync(distDir, publicDir, { recursive: true });
    console.log('>>> [Build] Frontend sincronizado con éxito.');
  }
}

console.log('>>> [Build] Proceso de compilación completado con éxito.');
