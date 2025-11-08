# Dual Chat Interface

A React-based dual chat application with Firebase integration, featuring side-by-side User and Agent chat interfaces.

## Features

- **Dual Chat Interface**: Two separate chat spaces side by side
  - Left: User Chat
  - Right: Agent Chat
- **Turn-Based Messaging**: Alternating message flow (Agent → User → Agent → User)
- **Firebase Integration**: User messages are stored in Firebase as msg1, msg2, etc.
- **Real-time Sync**: Messages sync between chats in real-time

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Firebase Realtime Database

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment to Netlify

### Option 1: Deploy via Netlify CLI

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

### Option 2: Deploy via Git (Recommended)

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [Netlify](https://www.netlify.com/)
3. Click "New site from Git"
4. Connect your repository
5. Netlify will automatically detect the build settings from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click "Deploy site"

### Option 3: Drag and Drop

1. Run `npm run build` locally
2. Go to [Netlify](https://app.netlify.com/drop)
3. Drag and drop the `dist` folder

## Configuration

The `netlify.toml` file contains the deployment configuration:
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 18
- SPA redirects configured for client-side routing

## Firebase Setup

Make sure your Firebase configuration in `src/App.tsx` is correct:
- API Key
- Database URL
- Project ID

The app stores user messages in the `GuestMsgs` path in Firebase Realtime Database.

## Project Structure

```
├── public/
│   ├── _redirects          # Netlify SPA redirects
│   └── ...
├── src/
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── index.html              # HTML template
├── netlify.toml            # Netlify configuration
└── package.json            # Dependencies and scripts
```

## License

MIT

