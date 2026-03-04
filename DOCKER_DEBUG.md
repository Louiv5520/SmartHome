# Docker Debug Guide

## Rettelser foretaget:

1. **Production Dockerfile**: Tilføjet build args så environment variables er tilgængelige under build-tid
2. **docker-compose.yml**: Tilføjet build args og REACT_APP_BACKEND_URL
3. **docker-compose.dev.yml**: Tilføjet REACT_APP_BACKEND_URL environment variable
4. **Backend CORS**: Opdateret til at tillade requests fra frontend containere
5. **Backend JWT_SECRET**: Tilføjet til environment variables

## Test Docker setup:

### Development mode:
```bash
docker-compose -f docker-compose.dev.yml up --build
```

### Production mode:
```bash
docker-compose up --build
```

## Vigtige noter:

- Frontend i production bliver bygget med environment variables fra build-tid
- I development læser React dev server environment variables dynamisk
- Backend kører på port 5000 og er tilgængelig fra browseren via localhost:5000
- Frontend kører på port 3000 (dev) eller 80 (production, mapped til 3000)

## Environment Variables:

Opret en `.env` fil i root med:
```env
REACT_APP_GOOGLE_CLIENT_ID=din_google_client_id
OPENWEATHER_API_KEY=din_openweather_api_key
JWT_SECRET=din_jwt_secret_key
```
