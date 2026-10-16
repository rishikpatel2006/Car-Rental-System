# DriveEase — Ready-to-run car rental project

This is a clean, working demo project designed to run without MongoDB setup or third-party packages. Car listings and bookings are stored in local JSON files so the demo keeps working even if MongoDB is not configured.

## Requirements
- Node.js 18 or newer
- No `npm install` required; the project uses Node.js built-in modules only.

## Run on Windows
1. Extract `DriveEase_Ready_Project.zip`.
2. Open the extracted `DriveEase_Ready_Project` folder in VS Code.
3. Select **Terminal → New Terminal**.
4. Run:

   ```bat
   npm start
   ```

5. Open **http://localhost:3000** in your browser.

If port 3000 is already occupied, use Command Prompt:

```bat
set PORT=3001 && npm start
```

Then open `http://localhost:3001`.

## Features
- Responsive car listing page with six demo cars
- Filter by car type and daily budget; search by name or features
- Booking form with date validation and automatic price calculation
- Booking confirmation and unique booking ID
- “My bookings” list with saved booking details
- API endpoints: `/api/health`, `/api/cars`, `/api/bookings`
- Booking data persists in `data/bookings.json`

## Project review notes
This version uses local JSON file storage rather than MongoDB so it can be demonstrated reliably with one command. Explain this honestly in your review. It is a demo-ready foundation; if your project requirements specifically mandate MongoDB, keep the MongoDB version as a separate deliverable and connect this app to MongoDB before claiming database integration.

## Troubleshooting
- Keep the terminal running while using the site.
- If the page does not load, check the terminal for `DriveEase is running: http://localhost:3000`.
- Do not open `index.html` directly from File Explorer; open the localhost URL.
