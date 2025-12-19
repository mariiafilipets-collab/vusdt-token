# Проверка API ключа

## ✅ Статус проверки

Ваш API ключ успешно настроен!

- **Формат:** Etherscan API V2
- **Длина:** 34 символа (корректно)
- **Расположение:** `.env` файл в корне проекта
- **Переменная:** `BSCSCAN_API_KEY`

## Что это означает

Etherscan API V2 - это унифицированный API, который работает для всех EVM-совместимых блокчейнов:
- ✅ BNB Smart Chain (BSC)
- ✅ Ethereum
- ✅ Base
- ✅ Arbitrum
- ✅ И более 60 других цепей

**Один API ключ работает для всех цепей!**

## Использование

API ключ будет автоматически использоваться при:
- Верификации контрактов на BSCScan
- Использовании команды `npx hardhat verify`

## Проверка работы

После развертывания контракта вы можете проверить верификацию:

```bash
npx hardhat verify --network bscMainnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## Дополнительная информация

- Документация Etherscan API V2: https://docs.etherscan.io/
- Управление API ключами: https://etherscan.io/myapikey или https://bscscan.com/myapikey
- Лимиты бесплатного плана: 5 запросов в секунду

