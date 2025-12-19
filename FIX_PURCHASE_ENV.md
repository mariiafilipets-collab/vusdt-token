# Исправление проблемы "Purchase contract is not configured"

## Проблема

Если вы видите сообщение "Purchase contract is not configured yet", это означает, что переменные окружения не загружены в React приложение.

## Решение

### Шаг 1: Проверьте файл frontend/.env

Убедитесь, что файл `frontend/.env` существует и содержит следующие строки:

```env
REACT_APP_VUSDT_ADDRESS=0xD92181195Ef229B84B6d896A945C903A982F8C4C
REACT_APP_YIELD_DISTRIBUTOR_ADDRESS=0x5117053513293a16752b21aF4E7CB69554ff7eA9
REACT_APP_PURCHASE_CONTRACT_ADDRESS=0xA4DB84870c79E531ea68075e9a503282BE6087c4
REACT_APP_USDT_TOKEN_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
```

### Шаг 2: Важно!

**React приложения загружают переменные окружения только при запуске!**

После изменения `frontend/.env`:
1. **Остановите** фронтенд (Ctrl+C в терминале)
2. **Запустите снова**: `cd frontend && npm start`

### Шаг 3: Проверка

После перезапуска:
- Откройте консоль браузера (F12)
- Проверьте, что нет ошибок
- Компонент Purchase VUSDT должен показывать форму для покупки

## Если проблема сохраняется

1. Убедитесь, что файл называется именно `.env` (не `.env.txt` или другое)
2. Убедитесь, что нет пробелов вокруг знака `=`
3. Убедитесь, что адреса правильные (скопируйте из `deployment-info.json`)
4. Проверьте консоль браузера на наличие ошибок

## Адреса контрактов (для справки)

- **VUSDT**: `0xD92181195Ef229B84B6d896A945C903A982F8C4C`
- **YieldDistributor**: `0x5117053513293a16752b21aF4E7CB69554ff7eA9`
- **VUSDTPurchase**: `0xA4DB84870c79E531ea68075e9a503282BE6087c4`
- **USDT Token (BSC Testnet)**: `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd`

