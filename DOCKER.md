# Docker Setup Guide

Dette projekt kan køres i Docker både til development og production.

## Prerequisites

- Docker og Docker Compose installeret
- `.env` fil med `REACT_APP_GOOGLE_CLIENT_ID` (se `.env.example`)

## Development Mode

Kør appen i development mode med hot reload:

```bash
docker-compose -f docker-compose.dev.yml up --build
```

Appen vil være tilgængelig på http://localhost:3000

For at stoppe:
```bash
docker-compose -f docker-compose.dev.yml down
```

## Production Build

Byg og kør production build:

```bash
docker-compose up --build
```

Appen vil være tilgængelig på http://localhost:3000

For at stoppe:
```bash
docker-compose down
```

## Kun Docker Build (uden docker-compose)

### Development:
```bash
docker build -f Dockerfile.dev -t ai-speaker-dev .
docker run -p 3000:3000 --env-file .env ai-speaker-dev
```

### Production:
```bash
docker build -t ai-speaker .
docker run -p 3000:80 --env-file .env ai-speaker
```

## Environment Variables

Sørg for at `.env` filen indeholder:
```
REACT_APP_GOOGLE_CLIENT_ID=din_client_id_her
```

## Troubleshooting

- **Port allerede i brug**: Skift port i `docker-compose.yml` (f.eks. `"3001:80"`)
- **Hot reload virker ikke**: Sørg for at bruge `docker-compose.dev.yml` til development
- **Environment variabler virker ikke**: Tjek at `.env` filen er i projektets rod og at den er korrekt formateret

## Cleanup

Fjern alle Docker containere og images:
```bash
docker-compose down
docker-compose -f docker-compose.dev.yml down
docker system prune -a
```
