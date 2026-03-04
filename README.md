# AI Speaker - Smart Display Frontend

En moderne React-baseret frontend til AI Speaker smart display med Google OAuth login, vejrdata, kalender og indstillinger.

## Features

- 🔐 Google OAuth login
- 🌤️ Vejrdata fra OpenWeatherMap API
- 📅 Kalender med dagens aftaler
- ⚙️ Indstillinger med baggrundsbillede upload
- 🎨 Moderne iOS-stil design med glassmorphism effekter
- 🐳 Docker support
- 🗄️ Backend API med SQLite database

## Tech Stack

### Frontend
- React 18
- CSS3 med glassmorphism effekter
- Google OAuth (@react-oauth/google)

### Backend
- Node.js + Express
- SQLite database
- RESTful API

## Quick Start

### Development (uden Docker)

1. **Install dependencies:**
```bash
npm install
cd backend && npm install
```

2. **Start backend:**
```bash
cd backend
npm run dev
```

3. **Start frontend (i ny terminal):**
```bash
npm start
```

4. **Åbn browser:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

### Development med Docker

```bash
docker-compose -f docker-compose.dev.yml up --build
```

### Production med Docker

```bash
docker-compose up --build
```

## Environment Variables

Opret en `.env` fil i projektets rod:

```env
REACT_APP_GOOGLE_CLIENT_ID=din_google_client_id
OPENWEATHER_API_KEY=din_openweather_api_key
```

## Projektstruktur

```
.
├── backend/              # Backend API
│   ├── database/         # SQLite database
│   ├── routes/           # API routes
│   └── server.js         # Express server
├── src/                  # React frontend
│   ├── components/       # React komponenter
│   ├── utils/            # Utility funktioner
│   └── config/           # Konfiguration
├── public/               # Statiske filer
└── docker-compose.yml    # Docker setup
```

## API Endpoints

Se [API.md](./API.md) for komplet API dokumentation.

## Docker Commands

```bash
# Development
npm run docker:dev

# Production
npm run docker:prod

# Stop
npm run docker:stop
```

## Database

Projektet bruger SQLite database som automatisk oprettes ved første kørsel. Database filen ligger i `backend/database/ai_speaker.db`.

## Dokumentation

- [Docker Setup](./DOCKER.md)
- [Google Login Setup](./GOOGLE_LOGIN_SETUP.md)
- [API Documentation](./API.md)

## License

Private project
