# Google Login Setup Guide

For at bruge Google login i denne applikation, skal du oprette en Google OAuth Client ID.

## Trin-for-trin guide:

1. **Gå til Google Cloud Console**
   - Besøg https://console.cloud.google.com/
   - Log ind med din Google-konto

2. **Opret eller vælg et projekt**
   - Klik på projekt-dropdownen øverst
   - Klik "New Project" eller vælg et eksisterende projekt

3. **Aktiver Google+ API**
   - Gå til "APIs & Services" > "Library"
   - Søg efter "Google+ API" eller "People API"
   - Klik på det og aktiver det

4. **Opret OAuth Credentials**
   - Gå til "APIs & Services" > "Credentials"
   - Klik "Create Credentials" > "OAuth client ID"
   - Hvis du bliver bedt om det, konfigurer OAuth consent screen først:
     - Vælg "External" (medmindre du har en Google Workspace)
     - Udfyld app-navn, support email, og developer contact
     - Gem og fortsæt

5. **Konfigurer OAuth Client ID**
   - Vælg "Web application" som application type
   - Giv det et navn (f.eks. "AI Speaker Frontend")
   - Under "Authorized JavaScript origins", tilføj:
     - `http://localhost:3000`
     - (Tilføj også din produktions-URL når du deployer)
   - Under "Authorized redirect URIs", tilføj:
     - `http://localhost:3000`
   - Klik "Create"

6. **Kopier Client ID**
   - Du vil se en dialog med din Client ID
   - Kopier Client ID'en (den ser ud som: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)

7. **Tilføj Client ID til projektet**
   - Opret en `.env` fil i projektets rod (samme niveau som package.json)
   - Tilføj følgende linje:
     ```
     REACT_APP_GOOGLE_CLIENT_ID=din_client_id_her
     ```
   - Erstat `din_client_id_her` med den Client ID du kopierede

8. **Genstart development server**
   - Stop din React development server (Ctrl+C)
   - Start den igen med `npm start`
   - Environment variabler bliver kun indlæst når serveren starter

## Fejlfinding:

- **"Google Client ID mangler" warning i konsollen**: Sørg for at `.env` filen er i projektets rod og at du har genstartet serveren
- **Login virker ikke**: Tjek at du har tilføjet `http://localhost:3000` til både Authorized JavaScript origins og Authorized redirect URIs
- **CORS fejl**: Sørg for at du har aktiveret Google+ API eller People API i Google Cloud Console

## Sikkerhedsnoter:

- **Aldrig commit `.env` filen til git**: Den er allerede i `.gitignore`
- **Brug forskellige Client IDs til development og production**: Opret separate OAuth clients for hver miljø
- **Beskyt din Client ID**: Selvom den er synlig i frontend-koden, skal du stadig holde den sikker og ikke dele den unødvendigt
