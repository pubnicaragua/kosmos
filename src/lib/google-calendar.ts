import { google } from 'googleapis'

/**
 * Google Calendar and Meet Integration
 * 
 * Setup Instructions:
 * 1. Go to Google Cloud Console: https://console.cloud.google.com/
 * 2. Create a new project or select existing
 * 3. Enable Google Calendar API
 * 4. Create OAuth 2.0 credentials
 * 5. Add authorized redirect URIs
 * 6. Set environment variables:
 *    - GOOGLE_CLIENT_ID
 *    - GOOGLE_CLIENT_SECRET
 *    - GOOGLE_REDIRECT_URI
 */

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
]

/**
 * Get OAuth2 client
 */
export function getOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  return oauth2Client
}

/**
 * Generate authorization URL for user to grant access
 */
export function getAuthUrl(userId: string) {
  const oauth2Client = getOAuth2Client()

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: userId, // Pass userId to identify user after redirect
  })

  return authUrl
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client()
  
  try {
    const { tokens } = await oauth2Client.getToken(code)
    return tokens
  } catch (error) {
    console.error('Error getting tokens:', error)
    throw error
  }
}

/**
 * Set credentials for authenticated requests
 */
export function setCredentials(accessToken: string, refreshToken?: string) {
  const oauth2Client = getOAuth2Client()
  
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  return oauth2Client
}

interface CreateEventParams {
  summary: string
  description?: string
  startDateTime: string // ISO 8601 format
  endDateTime: string   // ISO 8601 format
  attendees?: string[]  // Array of email addresses
  location?: string
  conferenceData?: boolean // Create Google Meet link
}

/**
 * Create a calendar event with optional Google Meet link
 */
export async function createCalendarEvent(
  accessToken: string,
  refreshToken: string | undefined,
  params: CreateEventParams
) {
  const oauth2Client = setCredentials(accessToken, refreshToken)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  try {
    const event: any = {
      summary: params.summary,
      description: params.description,
      start: {
        dateTime: params.startDateTime,
        timeZone: 'America/Managua', // Nicaragua timezone
      },
      end: {
        dateTime: params.endDateTime,
        timeZone: 'America/Managua',
      },
      attendees: params.attendees?.map(email => ({ email })),
      location: params.location,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 },      // 30 minutes before
        ],
      },
    }

    // Add Google Meet conference if requested
    if (params.conferenceData) {
      event.conferenceData = {
        createRequest: {
          requestId: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      }
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: params.conferenceData ? 1 : 0,
      sendUpdates: 'all', // Send email notifications to attendees
    })

    return {
      success: true,
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
      meetLink: response.data.conferenceData?.entryPoints?.[0]?.uri,
    }
  } catch (error: any) {
    console.error('Error creating calendar event:', error)
    
    // Handle token refresh if needed
    if (error.code === 401 && refreshToken) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken()
        // Retry with new token
        return createCalendarEvent(credentials.access_token!, refreshToken, params)
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError)
        throw new Error('Token expired and refresh failed')
      }
    }

    throw error
  }
}

/**
 * Update an existing calendar event
 */
export async function updateCalendarEvent(
  accessToken: string,
  refreshToken: string | undefined,
  eventId: string,
  params: Partial<CreateEventParams>
) {
  const oauth2Client = setCredentials(accessToken, refreshToken)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  try {
    const event: any = {}

    if (params.summary) event.summary = params.summary
    if (params.description) event.description = params.description
    if (params.location) event.location = params.location
    
    if (params.startDateTime) {
      event.start = {
        dateTime: params.startDateTime,
        timeZone: 'America/Managua',
      }
    }
    
    if (params.endDateTime) {
      event.end = {
        dateTime: params.endDateTime,
        timeZone: 'America/Managua',
      }
    }

    if (params.attendees) {
      event.attendees = params.attendees.map(email => ({ email }))
    }

    const response = await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody: event,
      sendUpdates: 'all',
    })

    return {
      success: true,
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
    }
  } catch (error) {
    console.error('Error updating calendar event:', error)
    throw error
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(
  accessToken: string,
  refreshToken: string | undefined,
  eventId: string
) {
  const oauth2Client = setCredentials(accessToken, refreshToken)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all',
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting calendar event:', error)
    throw error
  }
}

/**
 * Get user's calendar events
 */
export async function getCalendarEvents(
  accessToken: string,
  refreshToken: string | undefined,
  timeMin?: string,
  timeMax?: string
) {
  const oauth2Client = setCredentials(accessToken, refreshToken)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin || new Date().toISOString(),
      timeMax,
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    })

    return {
      success: true,
      events: response.data.items,
    }
  } catch (error) {
    console.error('Error getting calendar events:', error)
    throw error
  }
}
