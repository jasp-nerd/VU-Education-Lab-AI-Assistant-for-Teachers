# Privacy Policy for VU Education Lab AI Assistant

**Last Updated:** January 2026

## Overview

The VU Education Lab AI Assistant ("the Extension") is developed by the Education Lab (Onderwijswerkplaats) at Vrije Universiteit Amsterdam. We are committed to protecting your privacy and handling your data transparently.

## Data Collection and Use

### What We Collect

The Extension collects and processes the following information:

1. **Authentication Data**
   - Your VU email address (must be @vu.nl or @student.vu.nl)
   - Your name and profile picture from Google OAuth
   - Authentication tokens for secure API access

2. **Page Content**
   - Text content from web pages you actively choose to analyze
   - PDF text content when you open PDFs in the browser and use the extension

3. **User Preferences**
   - Language preference (English or Dutch)
   - Interface settings (e.g., floating popup toggle)

### How We Use Your Data

- **Authentication data** is used solely to verify you are a VU staff member or student and to authorize access to the AI backend service.
- **Page content** is sent to our secure Azure backend server only when you actively request analysis (by clicking a generate button). This content is processed in real-time and is **NOT stored** on our servers.
- **User preferences** are stored locally in your browser using Chrome's storage API and are never transmitted to external servers.

## Data Storage

### Local Storage
- User preferences and settings are stored locally in your browser
- Authentication tokens are stored locally and refreshed periodically

### Server-Side Processing
- Page content is processed in real-time and immediately discarded
- No webpage content, documents, or analysis results are stored on our servers
- API requests are logged for rate limiting and security purposes, but do not include page content

## Third-Party Services

The Extension uses the following third-party services:

1. **Google OAuth 2.0**
   - Used for secure authentication
   - Only your email address and basic profile information are requested
   - Governed by [Google's Privacy Policy](https://policies.google.com/privacy)

2. **Azure OpenAI Service**
   - Processes content analysis requests via our secure backend
   - Your data is NOT used to train AI models
   - Governed by [Microsoft's Privacy Statement](https://privacy.microsoft.com/privacystatement)

## Data Sharing

We do **NOT**:
- Sell your data to third parties
- Share your data with advertisers
- Use your data to train AI models
- Track your browsing history
- Store your analyzed content

## Permissions Explained

The Extension requires the following permissions:

| Permission | Purpose |
|------------|---------|
| `activeTab` | Read text content from the page you're analyzing (only when you click a generate button) |
| `identity` | Enable secure Google Sign-In with your VU account |
| `storage` | Save your language preferences and settings locally |
| `scripting` | Inject the floating icon and extract page content |

## Security Measures

- All data transmission uses HTTPS encryption
- Authentication uses industry-standard OAuth 2.0
- API keys are secured server-side and never exposed to the client
- Backend implements rate limiting and domain validation

## Access Restrictions

This Extension is exclusively available to:
- VU Amsterdam staff (@vu.nl email addresses)
- VU Amsterdam students (@student.vu.nl email addresses)

Personal Gmail or other email accounts cannot access the service.

## Your Rights

You have the right to:
- **Access**: View your stored authentication data via the Extension settings
- **Delete**: Sign out to remove your local authentication data
- **Opt-out**: Uninstall the Extension at any time

## Data Retention

- Local data is retained until you sign out or uninstall the Extension
- No server-side content data is retained beyond the immediate processing request
- Authentication logs are retained for 30 days for security purposes

## Children's Privacy

This Extension is intended for university educators and students and is not directed at children under 16 years of age.

## Changes to This Policy

We may update this Privacy Policy from time to time. We will notify users of any material changes by updating the "Last Updated" date at the top of this policy.

## Contact Us

If you have questions about this Privacy Policy or the Extension's data practices, please contact:

**VU Amsterdam Education Lab (Onderwijswerkplaats)**
- Email: onderwijswerkplaats@vu.nl
- Website: https://vu.nl/onderwijswerkplaats

## Consent

By using the VU Education Lab AI Assistant, you consent to the data practices described in this Privacy Policy.
