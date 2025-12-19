# Настройка функции покупки VUSDT за USDT

## Описание

Добавлена возможность покупки VUSDT токенов за настоящий USDT (BEP-20) по курсу 1:1. Все USDT отправляются на центральный кошелек.

## Шаги настройки

### 1. Настройка переменных окружения

Добавьте в `.env` в корне проекта:

```env
# Адрес USDT токена на BNB Chain
USDT_TOKEN_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd  # BSC Testnet
# USDT_TOKEN_ADDRESS=0x55d398326f99059fF775485246999027B3197955  # BSC Mainnet

# Адрес центрального кошелька для получения USDT
CENTRAL_WALLET_ADDRESS=0xВашАдресКошелька
```

### 2. Развертывание контракта

```bash
npm run deploy:testnet
```

Контракт `VUSDTPurchase` будет автоматически развернут, если указан `USDT_TOKEN_ADDRESS`.

### 3. Настройка фронтенда

Добавьте в `frontend/.env`:

```env
REACT_APP_PURCHASE_CONTRACT_ADDRESS=0xАдресPurchaseКонтракта
REACT_APP_USDT_TOKEN_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
```

Адрес Purchase контракта можно найти в `deployment-info.json` после развертывания.

### 4. Перезапуск фронтенда

```bash
cd frontend
npm start
```

## Адреса USDT на BNB Chain

- **BSC Testnet**: `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd`
- **BSC Mainnet**: `0x55d398326f99059fF775485246999027B3197955`

## Как это работает

1. Пользователь подключает кошелек
2. Вводит количество USDT для покупки
3. Сначала нужно одобрить (approve) трату USDT
4. Затем выполняется покупка:
   - USDT переводится с кошелька пользователя на центральный кошелек
   - VUSDT токены минтируются на кошелек пользователя (1:1)

## Безопасность

- Контракт использует `ReentrancyGuard` для защиты от атак
- Только владелец контракта может изменить адрес центрального кошелька
- USDT сразу отправляется на центральный кошелек, не хранится в контракте

## Функции контракта

- `purchaseVUSDT(uint256 usdtAmount)` - покупка VUSDT за USDT
- `setCentralWallet(address)` - изменение адреса центрального кошелька (только owner)
- `setUSDTToken(address)` - изменение адреса USDT токена (только owner)
- `emergencyWithdraw(address, uint256)` - экстренный вывод токенов (только owner)

