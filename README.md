# ChatApp - Real-time Messaging Application

A modern real-time chat application built with **Next.js 16**, **TypeScript**, **Convex**, and **Clerk** authentication — for the Tars Full Stack Engineer Internship Coding Challenge 2026.

## Features

### Required Features (1–10)

| # | Feature | Status |
|---|---------|--------|
| 1 | **Authentication** – Sign up / sign in via Clerk (email or social login) | ✅ |
| 2 | **User List & Search** – See all registered users, search by name | ✅ |
| 3 | **One-on-One Direct Messages** – Private real-time conversations | ✅ |
| 4 | **Message Timestamps** – Smart formatting (today → time, this year → date, older → full) | ✅ |
| 5 | **Empty States** – Helpful prompts when there are no conversations, messages, or search results | ✅ |
| 6 | **Responsive Layout** – Mobile-first sidebar + chat; sidebar hides when chatting on mobile | ✅ |
| 7 | **Online / Offline Status** – Green dot for online users with heartbeat tracking | ✅ |
| 8 | **Typing Indicator** – Animated dots when another user is typing | ✅ |
| 9 | **Unread Message Count** – Badge per conversation showing unread messages | ✅ |
| 10 | **Smart Auto-Scroll** – Scrolls to new messages automatically; shows "New messages ↓" button when scrolled up | ✅ |

### Optional / Bonus Features (11–14)

| # | Feature | Status |
|---|---------|--------|
| 11 | **Delete Own Messages** – Soft delete → "This message was deleted" | ✅ |
| 12 | **Message Reactions** – React with 👍 ❤️ 😂 😮 😢 (toggle on/off, counts) | ✅ |
| 13 | **Loading & Error States** – Skeleton loaders, spinners, retry on send failure | ✅ |
| 14 | **Group Chat** – Create named groups, multi-member conversations, sender labels | ✅ |

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Backend**: Convex (real-time database)
- **Authentication**: Clerk
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Clerk account (free tier)
- A Convex account (free tier)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd tars-assignment
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Clerk**
   - Go to [clerk.com](https://clerk.com) and create a new application
   - Copy your **Publishable Key** and **Secret Key**

4. **Set up Convex**
   - Go to [convex.dev](https://convex.dev) and create a new project
   - Run `npx convex dev` and follow the prompts to link your project

5. **Configure environment variables**
   Create a `.env.local` file:
   ```env
   # Convex
   CONVEX_DEPLOYMENT=<your-convex-deployment>
   NEXT_PUBLIC_CONVEX_URL=<your-convex-url>

   # Clerk
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
   CLERK_SECRET_KEY=<your-clerk-secret-key>
   ```

6. **Run the development servers**
   ```bash
   npm run dev
   ```
   This runs both Next.js and Convex dev servers concurrently.

7. **Open the app**
   Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── convex/                 # Convex backend
│   ├── schema.ts          # Database schema
│   ├── users.ts           # User queries/mutations
│   ├── conversations.ts   # Conversation queries/mutations
│   ├── messages.ts        # Message queries/mutations
│   └── http.ts            # Clerk webhook handler
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── page.tsx       # Main chat page
│   │   ├── sign-in/       # Clerk sign-in page
│   │   └── sign-up/       # Clerk sign-up page
│   ├── components/        # React components
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

## Database Schema

```typescript
// Users - synced from Clerk
users: {
  clerkId: string,
  email: string,
  name: string,
  imageUrl?: string,
  isOnline: boolean,
  lastSeen: number
}

// Conversations - 1:1 and group chats
conversations: {
  participantIds: Id<"users">[],
  isGroup?: boolean,
  groupName?: string,
  groupCreatorId?: Id<"users">,
  lastMessageId?: Id<"messages">,
  lastMessageTime?: number
}

// Messages
messages: {
  conversationId: Id<"conversations">,
  senderId: Id<"users">,
  content: string,
  isDeleted: boolean,
  reactions?: { emoji: string, userId: Id<"users"> }[]
}

// Typing indicators
typingIndicators: {
  conversationId: Id<"conversations">,
  userId: Id<"users">,
  isTyping: boolean,
  lastTypingTime: number
}

// Read receipts
readReceipts: {
  conversationId: Id<"conversations">,
  userId: Id<"users">,
  lastReadMessageId?: Id<"messages">,
  lastReadTime: number
}
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables
4. Deploy!

### Deploy Convex

```bash
npx convex deploy
```

## License

MIT

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
