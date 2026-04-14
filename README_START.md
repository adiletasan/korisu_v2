# Быстрый старт Korisu

## 1. Сгенерируй JWT ключи (один раз)

Открой Git Bash в папке korisu/ и выполни:

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

Файлы private.pem и public.pem должны быть в корне папки korisu/

## 2. Создай .env файл (необязательно)

Скопируй .env.example в .env — минимальная конфигурация уже настроена.
JWT ключи НЕ нужны в .env — они читаются автоматически из pem файлов.

## 3. Запусти

```powershell
docker-compose down -v
docker-compose up --build
```

## 4. Запусти фронтенд

```powershell
cd frontend
npm install
npm run dev
```

## 5. Открой браузер

http://localhost:5173

## 6. После регистрации — верифицируй аккаунт

```powershell
docker-compose exec postgres psql -U korisu -d korisu_db -c "UPDATE auth.users SET verified = true WHERE email = 'твой@email.com';"
```
