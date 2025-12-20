# StreamCast Project

A modern live streaming platform featuring a Go backend (RTMP + API) and Next.js Frontend.

## Environment Variables

Create a `.env` file in the `frontend` directory:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_RTMP_URL=rtmp://localhost:1935/live
```

## Setup

1.  **Backend**:
    ```bash
    cd backend
    go run cmd/api/main.go
    ```

2.  **Frontend**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

## Features
*   Live Streaming (RTMP -> HTTP-FLV)
*   CMS (Events, Posts, Streams)
*   Admin Panel
