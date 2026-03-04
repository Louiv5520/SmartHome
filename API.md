# API Documentation

Backend API for AI Speaker application.

## Base URL
- Development: `http://localhost:5000/api`
- Production: `http://your-domain.com/api`

## Endpoints

### Authentication

#### POST `/api/auth/google`
Authenticate user with Google OAuth.

**Request Body:**
```json
{
  "googleId": "123456789",
  "email": "user@example.com",
  "name": "User Name",
  "picture": "https://..."
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "googleId": "123456789",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://..."
  }
}
```

#### GET `/api/auth/user/:id`
Get user by ID.

**Response:**
```json
{
  "user": {
    "id": 1,
    "googleId": "123456789",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://..."
  }
}
```

### Users & Settings

#### GET `/api/users/:userId/settings`
Get user settings.

**Response:**
```json
{
  "settings": {
    "id": 1,
    "userId": 1,
    "location": "Copenhagen",
    "backgroundImage": "data:image/...",
    "preferences": {
      "language": "da",
      "units": "metric"
    }
  }
}
```

#### PUT `/api/users/:userId/settings`
Update user settings.

**Request Body:**
```json
{
  "location": "Copenhagen",
  "backgroundImage": "data:image/...",
  "preferences": {
    "language": "da",
    "units": "metric"
  }
}
```

### Calendar Events

#### GET `/api/calendar/:userId/events`
Get all events for a user. Optional query parameter `?date=YYYY-MM-DD` to filter by date.

**Response:**
```json
{
  "events": [
    {
      "id": 1,
      "userId": 1,
      "title": "Møde med teamet",
      "description": null,
      "date": "2024-01-14",
      "time": "10:00",
      "type": "meeting"
    }
  ]
}
```

#### GET `/api/calendar/:userId/events/today`
Get today's events for a user.

#### POST `/api/calendar/:userId/events`
Create a new event.

**Request Body:**
```json
{
  "title": "Møde med teamet",
  "description": "Optional description",
  "date": "2024-01-14",
  "time": "10:00",
  "type": "meeting"
}
```

#### PUT `/api/calendar/:userId/events/:eventId`
Update an event.

#### DELETE `/api/calendar/:userId/events/:eventId`
Delete an event.

### Weather

#### GET `/api/weather/current?location=Copenhagen`
Get current weather. Results are cached for 10 minutes.

**Response:**
```json
{
  "temp": 4,
  "feelsLike": 2,
  "high": 5,
  "low": 3,
  "condition": "spredte skyer",
  "icon": "⛅",
  "humidity": 91,
  "windSpeed": 6,
  "pressure": 1012,
  "visibility": "9.0",
  "city": "Copenhagen",
  "country": "DK"
}
```

#### GET `/api/weather/forecast?location=Copenhagen`
Get 5-day weather forecast.

**Response:**
```json
{
  "forecasts": [
    {
      "date": "2024-01-15",
      "dayName": "torsdag",
      "temp": 5,
      "high": 7,
      "low": 3,
      "icon": "☀️",
      "condition": "klar himmel"
    }
  ]
}
```

## Database Schema

### users
- id (INTEGER PRIMARY KEY)
- google_id (TEXT UNIQUE)
- email (TEXT UNIQUE)
- name (TEXT)
- picture (TEXT)
- created_at (DATETIME)
- updated_at (DATETIME)

### user_settings
- id (INTEGER PRIMARY KEY)
- user_id (INTEGER, FOREIGN KEY)
- location (TEXT)
- background_image (TEXT)
- preferences (TEXT JSON)
- created_at (DATETIME)
- updated_at (DATETIME)

### calendar_events
- id (INTEGER PRIMARY KEY)
- user_id (INTEGER, FOREIGN KEY)
- title (TEXT)
- description (TEXT)
- date (TEXT)
- time (TEXT)
- type (TEXT)
- created_at (DATETIME)
- updated_at (DATETIME)

### weather_cache
- id (INTEGER PRIMARY KEY)
- location (TEXT)
- data (TEXT JSON)
- expires_at (DATETIME)
- created_at (DATETIME)
