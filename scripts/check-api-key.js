require('dotenv').config();

console.log('🔍 Проверка API ключа...\n');

const apiKey = process.env.BSCSCAN_API_KEY || process.env.ETHERSCAN_API_KEY;

if (!apiKey) {
  console.log('❌ API ключ не найден в .env файле');
  console.log('\n📝 Добавьте в .env файл:');
  console.log('   BSCSCAN_API_KEY=ваш_ключ_здесь');
  console.log('\nИли используйте Etherscan API V2:');
  console.log('   ETHERSCAN_API_KEY=ваш_ключ_здесь');
  process.exit(1);
}

console.log('✅ API ключ найден!');
console.log(`   Тип: ${process.env.BSCSCAN_API_KEY ? 'BSCSCAN_API_KEY' : 'ETHERSCAN_API_KEY'}`);
console.log(`   Длина: ${apiKey.length} символов`);

if (apiKey.length < 20) {
  console.log('⚠️  Предупреждение: API ключ кажется слишком коротким');
} else if (apiKey.length >= 20 && apiKey.length <= 50) {
  console.log('✅ Формат ключа выглядит корректно');
} else {
  console.log('⚠️  Предупреждение: API ключ кажется слишком длинным');
}

console.log('\n📌 Информация:');
console.log('   Etherscan API V2 работает для всех EVM-совместимых цепей');
console.log('   Включая: BSC, Ethereum, Base, Arbitrum и более 60 других');
console.log('   Один API ключ работает для всех цепей!');

console.log('\n✅ API ключ готов к использованию!');
console.log('   Он будет использоваться для верификации контрактов на BSCScan');

