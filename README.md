# Bingo - Indian Style Multiplayer

A real-time 2-player Indian-style Bingo game as a Progressive Web App.

## Game Rules

1. Each player independently arranges numbers **1–25** on a **5×5 grid**
2. Players take turns calling a number — both players strike it on their grids
3. A **line** = any complete row, column, or diagonal (12 possible lines)
4. First to complete **5 lines** wins the round (**B-I-N-G-O**)
5. Series: best of 3, 5, 7, or 9

## How to Play

1. **Create a game** — get a 6-character room code
2. **Share the code** with your opponent
3. **Set up your grid** — tap cells to place numbers 1 through 25 in order
4. **Take turns** calling numbers — tap an unmarked number on your turn
5. Race to 5 completed lines!

## Running Locally

### Prerequisites
- Node.js 18+

### Server
```bash
cd server
npm install
npm run dev
```
Server runs on `http://localhost:3001`

### Client
```bash
cd client
npm install
npm run dev
```
Client runs on `http://localhost:5173`

### Playing
1. Open `http://localhost:5173` in two browser tabs
2. Enter your name and create a game in Tab 1
3. Copy the room code, switch to Tab 2, enter name and join with the code
4. Start the game!

## Deployment

GitHub Pages hosts **static files only**, so the client and server must be deployed separately:

| Component | Host | Cost |
|-----------|------|------|
| Client (React PWA) | GitHub Pages | Free |
| Server (Node.js + Socket.io) | Render | Free tier |

### Step 1: Deploy the Server on Render

1. Go to [render.com](https://render.com) and sign up (GitHub login works)
2. Click **New → Web Service** and connect your GitHub repo
3. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free
4. Add environment variable:
   - `CLIENT_ORIGIN` = `https://<your-username>.github.io` (your GitHub Pages URL)
5. Deploy — note the service URL (e.g. `https://bingo-server-xxxx.onrender.com`)

### Step 2: Deploy the Client on GitHub Pages

1. In your GitHub repo, go to **Settings → Pages → Source** and select **GitHub Actions**
2. Go to **Settings → Variables → Actions** and add a repository variable:
   - Name: `VITE_SERVER_URL`
   - Value: your Render server URL from Step 1 (e.g. `https://bingo-server-xxxx.onrender.com`)
3. Push to `main` — the GitHub Actions workflow will auto-build and deploy
4. Your game will be live at `https://<your-username>.github.io/bingo/`

### Quick Deploy Checklist

```
Render env var:   CLIENT_ORIGIN = https://<user>.github.io
GitHub Actions var: VITE_SERVER_URL = https://bingo-server-xxxx.onrender.com
```

> **Note**: Render's free tier spins down after 15 min of inactivity. The first connection may take ~30s to wake up.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite (PWA)
- **Backend**: Node.js + Express + Socket.io
- **Real-time**: WebSocket via Socket.io
- **PWA**: vite-plugin-pwa with service worker
