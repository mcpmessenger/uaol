/**
 * Guest session management
 * Handles guest user session IDs stored in localStorage
 */

const GUEST_ID_KEY = 'uaol_guest_id';

/**
 * Get or create a guest session ID
 */
export function getGuestId(): string {
  let guestId = localStorage.getItem(GUEST_ID_KEY);
  
  if (!guestId) {
    // Generate new guest ID
    guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }
  
  return guestId;
}

/**
 * Check if user is in guest mode (no auth token)
 */
export function isGuest(): boolean {
  const token = localStorage.getItem('uaol_auth_token');
  return !token;
}

/**
 * Clear guest session (when user registers/logs in)
 */
export function clearGuestSession(): void {
  localStorage.removeItem(GUEST_ID_KEY);
}

/**
 * Get guest session info
 */
export function getGuestSessionInfo(): { guestId: string; isGuest: boolean } {
  return {
    guestId: getGuestId(),
    isGuest: isGuest(),
  };
}

