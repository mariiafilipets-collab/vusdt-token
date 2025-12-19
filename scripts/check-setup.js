const fs = require('fs');
const path = require('path');

console.log('🔍 Проверка настройки проекта VUSDT...\n');

let allGood = true;

// Проверка структуры папок
const requiredDirs = [
  'contracts',
  'scripts',
  'test',
  'frontend',
  'frontend/src',
  'frontend/src/components',
  'frontend/src/hooks'
];

console.log('📁 Проверка структуры папок...');
requiredDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`  ✅ ${dir}`);
  } else {
    console.log(`  ❌ ${dir} - отсутствует!`);
    allGood = false;
  }
});

// Проверка основных файлов
const requiredFiles = [
  'contracts/VUSDT.sol',
  'contracts/YieldDistributor.sol',
  'scripts/deploy.js',
  'scripts/distribute-yield.js',
  'test/VUSDT.test.js',
  'test/YieldDistributor.test.js',
  'hardhat.config.js',
  'package.json',
  'frontend/package.json',
  'frontend/src/App.js',
  'frontend/src/index.js'
];

console.log('\n📄 Проверка основных файлов...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - отсутствует!`);
    allGood = false;
  }
});

// Проверка node_modules
console.log('\n📦 Проверка зависимостей...');
if (fs.existsSync('node_modules')) {
  console.log('  ✅ Backend зависимости установлены');
} else {
  console.log('  ❌ Backend зависимости не установлены. Запустите: npm install');
  allGood = false;
}

if (fs.existsSync('frontend/node_modules')) {
  console.log('  ✅ Frontend зависимости установлены');
} else {
  console.log('  ❌ Frontend зависимости не установлены. Запустите: cd frontend && npm install');
  allGood = false;
}

// Проверка .env файлов
console.log('\n⚙️  Проверка конфигурации...');
if (fs.existsSync('.env')) {
  console.log('  ✅ .env файл существует');
} else {
  console.log('  ⚠️  .env файл не найден. Создайте его из .env.example');
  console.log('     Это нужно для развертывания контрактов');
}

if (fs.existsSync('frontend/.env')) {
  console.log('  ✅ frontend/.env файл существует');
} else {
  console.log('  ⚠️  frontend/.env файл не найден. Создайте его после развертывания контрактов');
}

// Проверка артефактов компиляции
console.log('\n🔨 Проверка компиляции...');
if (fs.existsSync('artifacts/contracts/VUSDT.sol/VUSDT.json')) {
  console.log('  ✅ Контракты скомпилированы');
} else {
  console.log('  ⚠️  Контракты не скомпилированы. Запустите: npx hardhat compile');
}

console.log('\n' + '='.repeat(50));
if (allGood) {
  console.log('✅ Все проверки пройдены! Проект готов к использованию.');
  console.log('\n📝 Следующие шаги:');
  console.log('  1. Настройте .env файл с вашим PRIVATE_KEY');
  console.log('  2. Разверните контракты: npm run deploy:testnet');
  console.log('  3. Обновите frontend/.env с адресами контрактов');
  console.log('  4. Запустите фронтенд: cd frontend && npm start');
} else {
  console.log('⚠️  Обнаружены проблемы. Пожалуйста, исправьте их перед использованием.');
}
console.log('='.repeat(50));

process.exit(allGood ? 0 : 1);

