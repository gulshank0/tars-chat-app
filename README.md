# ChatApp — Real-Time Chat Application

A full-featured, real-time chat application built with **Next.js 16**, **Convex**, and **Clerk**. Supports one-on-one messaging, group chats, typing indicators, read receipts, emoji reactions, online presence tracking, and more — all updating live with zero polling.

---

## Features

### 💬 Real-Time Messaging
Messages are delivered instantly to all participants via Convex's reactive subscriptions — no manual polling or custom WebSocket code required.

### 👥 1:1 & Group Conversations
- Start a direct message with any user in a single click.
- Create named group chats — search and select members, then start chatting with everyone at once.
- Group messages display sender labels so you always know who said what.

### 🟢 Online / Offline Presence
- Tracks user presence using page visibility, focus/blur events, and a 30-second heartbeat.
- A green dot on avatars and in the chat header shows who's currently online.

### ⌨️ Typing Indicators
- See animated "typing…" dots when someone is composing a message.
- Typing state auto-expires after 3 seconds of inactivity.
- Shown both inside the chat area and as a preview in the conversation list.

### ✅ Read Receipts & Unread Badges
- Tracks the last-read message per user per conversation.
- Unread message count badges appear on conversations in the sidebar (capped at 99+).
- Opening a conversation automatically marks it as read.

### 😍 Emoji Reactions
- React to any message with one of five emojis: 👍 ❤️ 😂 😮 😢
- Toggle reactions on/off — reactions are grouped with counts and highlighted for the current user.

### 🗑️ Message Deletion
- Senders can soft-delete their own messages.
- Deleted messages render as *"This message was deleted"* for all participants.

### 🔍 User & Conversation Search
- Full-text search across users powered by a Convex search index.
- Client-side filtering of conversations by user or group name.

### 📱 Responsive Layout
- Mobile-first design that toggles between the sidebar and the chat view.
- Side-by-side layout on larger desktop screens.
- A back button in the chat header lets you navigate back on mobile.

### ⬇️ Smart Auto-Scroll
- Automatically scrolls to the newest message when you're already at the bottom.
- A floating **"New messages ↓"** button appears when you've scrolled up, letting you jump back instantly.

### 🕐 Smart Timestamps
- Today's messages show time only, this year's show date, older messages show the full date — always human-readable.

### 🖼️ Avatars with Fallback
- Displays Clerk profile images, or a deterministic colored-initial fallback avatar derived from the user's name.

### ⚡ Loading & Error States
- Skeleton loaders and spinners keep the UI responsive while data loads.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router), React 19 |
| **Backend & Database** | Convex (real-time serverless backend) |
| **Authentication** | Clerk (`@clerk/nextjs`) |
| **Styling** | Tailwind CSS 4, clsx, tailwind-merge, CVA |
| **Icons** | Lucide React |
| **Date Formatting** | date-fns |
| **Webhook Verification** | Svix |
| **Language** | TypeScript 5 |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Clerk](https://clerk.com) account
- A [Convex](https://convex.dev) account

### Installation

```bash
git clone https://github.com/your-username/chatapp.git
cd chatapp
npm install
```

### Environment Variables

Create a `.env.local` file in the root:

```env
CONVEX_DEPLOYMENT=<your-convex-deployment>
NEXT_PUBLIC_CONVEX_URL=<your-convex-url>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
CLERK_SECRET_KEY=<your-clerk-secret-key>
```

### Run the Dev Server

```bash
npm run dev
```

This starts both the Next.js dev server and the Convex backend concurrently. Open [http://localhost:3000](http://localhost:3000) to use the app.

---

## Project Structure

```
├── convex/                  # Convex backend
│   ├── schema.ts           # Database schema
│   ├── users.ts            # User queries & mutations
│   ├── conversations.ts    # Conversation queries & mutations
│   ├── messages.ts         # Message queries & mutations
│   └── http.ts             # Clerk webhook handler
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── page.tsx        # Main chat page
│   │   ├── sign-in/        # Sign-in page
│   │   └── sign-up/        # Sign-up page
│   ├── components/         # React components
│   │   ├── Sidebar.tsx
│   │   ├── UserList.tsx
│   │   ├── ConversationList.tsx
│   │   ├── ChatArea.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── MessageInput.tsx
│   │   ├── GroupCreateModal.tsx
│   │   └── UserAvatar.tsx
│   ├── hooks/
│   │   └── useOnlineStatus.ts
│   └── lib/
│       ├── utils.ts
│       └── formatTime.ts
```

---

## Deployment

1. Push your code to GitHub.
2. Import the project on [Vercel](https://vercel.com).
3. Add environment variables in the Vercel dashboard.
4. Deploy the Convex backend:
   ```bash
   npx convex deploy
   ```

---

## License

MIT
