# SIH Backend

## New: Driver Management APIs

## New: Route Management APIs

### 1) Create Route
- **Method**: `POST`
- **Path**: `/api/admin/routes`
- **Protected**: Yes (admin must be authenticated)
- **Request Body**:
```json
{
  "routeName": "route1",
  "stops": [
    { "stopId": "s1", "name": "Connaught Place", "latitude": 28.6328, "longitude": 77.2197 },
    { "stopId": "s3", "name": "Noida Sec-62", "latitude": 28.628, "longitude": 77.3649 },
    { "stopId": "s4", "name": "Rajiv Chowk", "latitude": 28.633, "longitude": 77.2194 }
  ]
}
```
- **Validation**:
  - **routeName**: required
  - **stops**: array with at least 2 stops
  - Each stop must include: **stopId** (string), **name** (string), **latitude** (number), **longitude** (number)
  - Duplicate **routeName** → `409 Conflict`
- **Responses**:
  - 201 Created
  ```json
  {
    "success": true,
    "route": {
      "_id": "...",
      "routeName": "route1",
      "stops": [
        { "stopId": "s1", "name": "Connaught Place", "latitude": 28.6328, "longitude": 77.2197 },
        { "stopId": "s3", "name": "Noida Sec-62", "latitude": 28.628, "longitude": 77.3649 },
        { "stopId": "s4", "name": "Rajiv Chowk", "latitude": 28.633, "longitude": 77.2194 }
      ],
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
  ```
  - 400 Bad Request → validation failures
  - 409 Conflict → routeName exists
  - 500 Server Error

### 2) Get All Routes
- **Method**: `GET`
- **Path**: `/api/admin/routes`
- **Protected**: Yes
- **Response 200 OK**:
```json
[
  {
    "_id": "...",
    "routeName": "route1",
    "stops": [
      { "stopId": "s1", "name": "Connaught Place", "latitude": 28.6328, "longitude": 77.2197 },
      { "stopId": "s3", "name": "Noida Sec-62", "latitude": 28.628, "longitude": 77.3649 },
      { "stopId": "s4", "name": "Rajiv Chowk", "latitude": 28.633, "longitude": 77.2194 }
    ],
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

### Implementation
- **Model**: `src/models/Route.js`
- **Controller**: `src/controllers/routeController.js` (exports `addRoute`, `getAllRoutes`)
- **Routes**: `src/routes/routeRoutes.js` (mounted in `src/server.js` under `/api/admin`)
- **Notes**:
  - Uses async/await with try/catch
  - Returns JSON with `{ success, route }` for create and array of routes for list
  - Ensure your admin/session auth middleware is applied on `/api/admin`

Two protected endpoints under `/api/admin`.

### 1) Add Driver
- Method: `POST`
- Path: `/api/admin/drivers`
- Protected: Yes (ensure your admin/session middleware is applied on `/api/admin` routes)
- Request body (JSON):
```json
{
  "name": "Rajesh Kumar",
  "email": "rajesh@example.com",
  "phone": "+91-9876543210"
}
```
- Responses:
  - 201 Created
    ```json
    {
      "success": true,
      "driver": {
        "id": "...",
        "name": "Rajesh Kumar",
        "email": "rajesh@example.com",
        "phone": "+91-9876543210",
        "username": "drv_ab12cd",
        "assignedBus": "No",
        "status": "active"
      },
      "password": "PLAINTEXT_PASSWORD"
    }
    ```
  - 400 Bad Request → missing fields
    ```json
    { "success": false, "message": "name, email, and phone are required" }
    ```
  - 409 Conflict → email already exists
    ```json
    { "success": false, "message": "Email already exists" }
    ```
  - 500 Server Error

Notes:
- A username like `drv_<6-char nanoid>` is auto-generated.
- A random secure password (8–10 chars with upper/lower/digits/symbols) is generated and hashed with bcrypt (saltRounds=10).
- The plaintext password is emailed to the driver and returned once in the response.

### 2) Get All Drivers
- Method: `GET`
- Path: `/api/admin/drivers`
- Protected: Yes
- Response 200 OK:
```json
[
  {
    "id": "...",
    "name": "...",
    "email": "...",
    "phone": "...",
    "username": "...",
    "assignedBus": "No",
    "status": "active",
    "createdAt": "2025-09-09T10:00:00.000Z",
    "updatedAt": "2025-09-09T10:00:00.000Z"
  }
]
```

## Implementation Details
- Model: `src/models/Driver.js`
- Controller: `src/controllers/driverController.js` (exports `addDriver`, `getAllDrivers`)
- Routes: `src/routes/driverRoutes.js` (mounted in `src/server.js` under `/api/admin`)
- Utils:
  - `src/utils/password.js` → `generateRandomPassword()`
  - `src/utils/email.js` → `sendEmail({ to, subject, text })` using Nodemailer

## Email Configuration
This project uses Gmail via Nodemailer.

Set the following in your `.env`:
```
MAIL_USER=your_gmail_address@gmail.com
MAIL_PASS=<gmail_app_password>
```

For your provided key, set:
```
MAIL_USER=<your Gmail address>
MAIL_PASS=mlma hnhm ayba zjmu
```

> Make sure you are using a Google App Password (requires 2FA). The sender is `MAIL_USER`.

## Install & Run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Ensure `.env` has:
   - `MONGO_URI`
   - `MONGO_DB_NAME`
   - `MAIL_USER`
   - `MAIL_PASS`
3. Start server:
   ```bash
   npm run dev
   ```

## Security Notes
- The plaintext password is only sent in the email and the one-time create response.
- The database stores only `passwordHash`.
- Apply your admin/session auth middleware on `/api/admin` so these routes are protected.