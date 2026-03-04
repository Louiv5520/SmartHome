/**
 * Utility function to log out all users by clearing all localStorage data
 * This can be called manually when needed (e.g., from admin panel or console)
 */
export const logoutAllUsers = () => {
  // Clear all localStorage items related to login and user data
  localStorage.removeItem('aiSpeaker_loggedIn');
  localStorage.removeItem('aiSpeaker_setupComplete');
  localStorage.removeItem('aiSpeaker_userInfo');
  localStorage.removeItem('aiSpeaker_googleToken');
  localStorage.removeItem('aiSpeaker_userName');
  localStorage.removeItem('aiSpeaker_location');
  localStorage.removeItem('aiSpeaker_preferences');
  localStorage.removeItem('aiSpeaker_backgroundImage');
  localStorage.removeItem('aiSpeaker_calendarEvents');
  
  // Reload the page to reset app state
  window.location.reload();
};

// Make it available globally for easy access from browser console
if (typeof window !== 'undefined') {
  window.logoutAllUsers = logoutAllUsers;
}

export default logoutAllUsers;
