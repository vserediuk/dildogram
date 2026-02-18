# Messenger (Telegram-like)

## Stack
- **Backend:** Python 3.11+ / FastAPI
- **Frontend:** React 18 + Tailwind CSS
- **Database:** PostgreSQL
- **Real-time:** WebSockets

## Features
- Auth (password + SMS-code simulation)
- Private messages (real-time)
- Group chats
- Message status (sent / delivered / read)
- Chat list with last message preview
- User profile (avatar, name, bio)

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Docker
```bash
docker-compose up --build
```

## Deploy to Render.com

Все три сервиса (PostgreSQL, Backend, Frontend) деплоятся через **Render Blueprint**.

### Автоматический деплой (рекомендуется)

1. Запушьте репозиторий на GitHub
2. Зайдите на [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**
3. Выберите репозиторий — Render автоматически найдёт `render.yaml`
4. Render создаст:
   - **messenger-db** — PostgreSQL база данных
   - **messenger-backend** — Web Service (Docker)
   - **messenger-frontend** — Static Site
5. После первого деплоя обновите URL-ы:
   - В `messenger-backend` → Environment → `FRONTEND_URL` → вставьте реальный URL фронтенда
   - В `messenger-frontend` → Environment → `VITE_API_URL` → вставьте `https://<ваш-backend>.onrender.com/api`

### Ручной деплой

#### 1. База данных
- Dashboard → **New** → **PostgreSQL** → создайте БД (Free plan)
- Скопируйте **Internal Database URL**

#### 2. Backend
- Dashboard → **New** → **Web Service** → выберите репо
- **Root Directory:** `backend`
- **Runtime:** Docker
- **Environment Variables:**
  - `DATABASE_URL` = Internal Database URL из шага 1
  - `SECRET_KEY` = случайная строка
  - `UPLOAD_DIR` = `/app/uploads`
  - `FRONTEND_URL` = URL фронтенда (добавите после деплоя)

#### 3. Frontend
- Dashboard → **New** → **Static Site** → выберите репо
- **Build Command:** `cd frontend && npm install && npm run build`
- **Publish Directory:** `frontend/dist`
- **Environment Variables:**
  - `VITE_API_URL` = `https://<ваш-backend>.onrender.com/api`
- **Rewrite Rules:** `/* → /index.html` (для SPA роутинга)
