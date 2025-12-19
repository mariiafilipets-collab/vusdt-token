# 🔄 Переключение на BNB Chain Mainnet

## ✅ Изменения внесены

Код обновлен для работы с **BNB Chain Mainnet** (Chain ID: 56) вместо BSC Testnet.

### Измененные файлы:

1. **`frontend/src/hooks/useWeb3.js`**
   - Проверка сети изменена с `BSC_TESTNET (97)` на `BSC_MAINNET (56)`
   - Контракты инициализируются только при подключении к mainnet

2. **`frontend/src/components/WalletConnection.js`**
   - Сообщения обновлены: "BNB Chain Mainnet" вместо "BSC Testnet"
   - Кнопка переключения теперь переключает на mainnet
   - Успешное сообщение показывает "BNB Chain Mainnet (Chain ID: 56)"

3. **`frontend/src/components/WalletButton.js`**
   - Логика переключения обновлена для mainnet
   - Предупреждение показывается, если подключен testnet

4. **`frontend/src/components/PurchaseVUSDT.js`**
   - Проверка сети обновлена на `isBSCMainnet`

---

## 🚀 Что нужно сделать

### Шаг 1: Закоммитьте изменения

```bash
cd D:\VUSDT

# Добавьте измененные файлы
git add frontend/src/hooks/useWeb3.js
git add frontend/src/components/WalletConnection.js
git add frontend/src/components/WalletButton.js
git add frontend/src/components/PurchaseVUSDT.js

# Создайте коммит
git commit -m "Switch to BSC Mainnet (56) instead of Testnet"

# Загрузите на GitHub
git push origin main
```

### Шаг 2: Vercel автоматически передеплоит

После push Vercel:
- Обнаружит изменения
- Запустит новый деплой
- Сайт будет требовать подключение к **BNB Chain Mainnet**

---

## 📋 Проверка после деплоя

После успешного деплоя проверьте:

1. ✅ Сайт загружается без ошибок
2. ✅ При подключении кошелька требуется переключение на **BNB Chain Mainnet**
3. ✅ После переключения на mainnet контракты инициализируются
4. ✅ Все функции работают (баланс, покупка, конвертация)

---

## 🔗 Адреса контрактов на Mainnet

Из `deployment-info.json`:

- **VUSDT Token:** `0x848444767795e730A5b243fEF10f29E7B064E01D`
- **YieldDistributor:** `0xE1A976055A5D89Fcb818a2C2698D7498Cb7C9e28`
- **VUSDTPurchase:** `0x49b6943400a5F254610c453cdEA7A6977bD6022a`
- **ConversionRequest:** `0xD92181195Ef229B84B6d896A945C903A982F8C4C`
- **USDT Token (BEP-20):** `0x55d398326f99059fF775485246999027B3197955`
- **Central Wallet:** `0x8973987BF03AeA074daB64a98fe13D2538C1302b`
- **Treasury Wallet:** `0x8973987BF03AeA074daB64a98fe13D2538C1302b`

---

## ⚠️ Важно

Убедитесь, что в **Vercel Environment Variables** установлены правильные адреса контрактов для mainnet:

```
REACT_APP_VUSDT_ADDRESS=0x848444767795e730A5b243fEF10f29E7B064E01D
REACT_APP_YIELD_DISTRIBUTOR_ADDRESS=0xE1A976055A5D89Fcb818a2C2698D7498Cb7C9e28
REACT_APP_PURCHASE_CONTRACT_ADDRESS=0x49b6943400a5F254610c453cdEA7A6977bD6022a
REACT_APP_CONVERSION_CONTRACT_ADDRESS=0xD92181195Ef229B84B6d896A945C903A982F8C4C
REACT_APP_USDT_TOKEN_ADDRESS=0x55d398326f99059fF775485246999027B3197955
```

---

**Готово! После коммита и push сайт будет работать с BNB Chain Mainnet! 🚀**

