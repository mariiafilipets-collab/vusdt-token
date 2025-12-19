# Информация о развертывании

## ✅ Контракты успешно развернуты!

### Сеть: BSC Testnet (Chain ID: 97)

### Адреса контрактов:

- **VUSDT Token:** `0x848444767795e730A5b243fEF10f29E7B064E01D`
  - [Просмотр на BSCScan Testnet](https://testnet.bscscan.com/address/0x848444767795e730A5b243fEF10f29E7B064E01D)

- **YieldDistributor:** `0xE1A976055A5D89Fcb818a2C2698D7498Cb7C9e28`
  - [Просмотр на BSCScan Testnet](https://testnet.bscscan.com/address/0xE1A976055A5D89Fcb818a2C2698D7498Cb7C9e28)

### Информация о развертывании:

- **Deployer:** `0x8973987BF03AeA074daB64a98fe13D2538C1302b`
- **Начальный баланс:** 1,000,000 VUSDT (заминтин на адрес deployer)
- **Дата развертывания:** 2025-12-19

### Что было сделано:

1. ✅ Развернут контракт VUSDT Token
2. ✅ Развернут контракт YieldDistributor
3. ✅ Настроена связь между контрактами
4. ✅ Заминтин начальный баланс (1M VUSDT)
5. ✅ Deployer зарегистрирован как holder
6. ✅ Обновлен frontend/.env с адресами контрактов

### Следующие шаги:

1. **Верификация контрактов (опционально):**
   ```bash
   npx hardhat verify --network bscTestnet 0x848444767795e730A5b243fEF10f29E7B064E01D 0x8973987BF03AeA074daB64a98fe13D2538C1302b
   npx hardhat verify --network bscTestnet 0xE1A976055A5D89Fcb818a2C2698D7498Cb7C9e28 0x848444767795e730A5b243fEF10f29E7B064E01D 0x8973987BF03AeA074daB64a98fe13D2538C1302b
   ```

2. **Запуск фронтенда:**
   ```bash
   cd frontend
   npm start
   ```

3. **Тестирование:**
   - Подключите MetaMask к BSC Testnet
   - Перейдите на http://localhost:3000
   - Протестируйте все функции

4. **Начисление доходности:**
   - Каждую пятницу в 00:00 UTC вызывайте `distributeYield()`
   - Или используйте админ-панель в веб-интерфейсе

### Развертывание на Mainnet:

Когда будете готовы развернуть на BSC Mainnet:

```bash
npm run deploy:mainnet
```

⚠️ **Важно:** Перед развертыванием на mainnet:
- Тщательно протестируйте на testnet
- Убедитесь, что все работает корректно
- Проверьте баланс BNB для газа

### Полезные ссылки:

- BSCScan Testnet: https://testnet.bscscan.com/
- BSC Testnet Faucet: https://testnet.binance.org/faucet-smart
- Документация: README.md

