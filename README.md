# Pastebin-Lite

A simple Pastebin-like application built with **Node.js, Express, and MongoDB**.
Users can create text pastes with optional expiration time (TTL) and view limits.

## Features
- Create text pastes with unique URLs.
- Set optional Time-To-Live (TTL) expiry.
- Set optional Maximum View Count.
- View pastes via a clean UI.
- Deterministic API testing support (`TEST_MODE=1`).

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB Atlas (Mongoose ODM)
- **Templating**: EJS
- **Styling**: Vanilla CSS

## Setup Instructions

1.  **Clone the repository** (if applicable) or download the source code.
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Configure Environment**:
    Create a `.env` file in the root directory (copy from example or use the following):
    ```env
    MONGODB_URI=your_mongodb_connection_string
    PORT=3000
    TEST_MODE=0
    ```
    *Note: You must provide a valid MongoDB Atlas connection string.*

4.  **Run the Application**:
    ```bash
    npm start
    ```
    The app will run at `http://localhost:3000`.

## Testing
To run with deterministic time testing enabled:
```bash
set TEST_MODE=1
npm start
```
When `TEST_MODE=1`, send the header `x-test-now-ms` with a timestamp (ms) to simulate the current time for expiry checks.

## Persistence Layer
**MongoDB** was chosen as the persistence layer for its flexibility with unstructured text data and built-in TTL index capabilities (though application-level checks are also implemented for precise deterministic testing).

## Design Decisions
- **EJS**: Used for server-side rendering to keep the architecture simple and aligned with the "serverless" friendly requirement without needing a separate frontend build process.
- **Nanoid**: Generates short, URL-friendly unique IDs.
- **Dual Expiry Logic**: We use both MongoDB's naturally reliable storage and application-level checks to strictly enforce the "Max Views" and "Exact Time" requirements, ensuring edge cases are handled immediately.
