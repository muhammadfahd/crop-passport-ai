# CropPassport AI

CropPassport AI is a plain HTML, CSS, and vanilla JavaScript project with an Express backend. Harvests, activities, passports, QR links, and buyer views continue to use browser `localStorage`.

## Run locally

1. Create a `.env` file in this folder.
2. Add your OpenRouter key:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

3. Install dependencies:

```bash
npm install
```

4. Start the application:

```bash
npm start
```

5. Open `http://localhost:3000`.

The Express server serves the HTML, CSS, JavaScript, images, and both AI endpoints. No additional static file server is required.

## Test AI Activity Analysis

1. Create a harvest and open its details page.
2. Select **Add Text Activity**.
3. Enter: `Today I sprayed pesticide on my mango trees because I noticed insects after yesterday's rain.`
4. Set an activity date and select **Analyze with AI**.
5. Review the structured AI result and select **Save to Timeline**.

The frontend calls `POST /api/analyze-activity`; Express calls OpenRouter with the server-only `OPENROUTER_API_KEY`. If the request fails, the farmer can return to the note and retry without losing it.

## Test AI Traceability Summary

1. Add saved activities to a harvest.
2. Open that harvest's passport.
3. Select **Generate AI Traceability Summary**.
4. The summary is saved to the harvest in `localStorage` and shown again in the buyer view without another AI request.

## Security

- Keep the real key only in `.env`; it is ignored by Git.
- Do not place API keys in frontend JavaScript, HTML, or `localStorage`.
- Server logs report failure categories without printing the API key.
