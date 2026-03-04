// Google OAuth Configuration
export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
  console.error('⚠️ REACT_APP_GOOGLE_CLIENT_ID mangler i environment variables!');
  console.error('Opret en .env fil med: REACT_APP_GOOGLE_CLIENT_ID=din_client_id');
}
