# 🚀 Developer Community Platform

A modern, full-stack developer community platform similar to Stack Overflow, where developers can ask questions, share knowledge, and collaborate with peers.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-blue?style=for-the-badge)](https://assignment-12-cf373.web.app/)
[![Firebase Hosting](https://img.shields.io/badge/Firebase-Hosting-orange?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-green?style=for-the-badge&logo=mongodb)](https://mongodb.com/)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)

## 🌟 Features

### 📝 Core Features
- **Post Questions & Discussions** - Create posts with rich text descriptions and tags
- **Voting System** - Upvote and downvote posts to highlight quality content
- **Comments System** - Engage in discussions with threaded comments
- **Tag-based Filtering** - Organize content with customizable tags
- **Search Functionality** - Find relevant posts quickly
- **User Profiles** - Track your posts and community contributions

### 👥 User Management
- **Firebase Authentication** - Secure login/registration system
- **Role-based Access** - Different permissions for users, members, and admins
- **Premium Membership** - Stripe-powered subscription system
- **Post Limits** - Free users limited to 5 posts, unlimited for members

### 🛡️ Moderation & Safety
- **Comment Reporting** - Community-driven content moderation
- **Admin Dashboard** - Comprehensive admin tools for platform management
- **User Promotion** - Promote users to admin status
- **Content Management** - Delete inappropriate content

### 📊 Additional Features
- **Announcements System** - Platform-wide announcements from admins
- **Pagination** - Efficient content loading with pagination
- **Sorting Options** - Sort by newest, most popular, etc.
- **Responsive Design** - Works seamlessly on all devices

## 🛠️ Tech Stack

### Frontend
- **React.js** - User interface library
- **Firebase** - Authentication and hosting
- **Tailwind CSS** - Styling framework
- **React Router** - Client-side routing

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Firebase Admin SDK** - Server-side authentication

### Payment Processing
- **Stripe** - Payment gateway for premium subscriptions

### Additional Tools
- **CORS** - Cross-origin resource sharing
- **JWT** - Token-based authentication
- **dotenv** - Environment variable management

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account
- Firebase project
- Stripe account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd developer-community-platform
   ```

2. **Install dependencies**
   ```bash
   # Backend
   npm install
   
   # Frontend (if separate)
   cd client
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DB_USERNAME=your_mongodb_username
   DB_PASSWORD=your_mongodb_password
   
   # Firebase
   FIREBASE_SERVICE_KEY=your_base64_encoded_service_key
   
   # Stripe
   STRIPE_SECRET_KEY=your_stripe_secret_key
   PAYMENT_GATEWAY_KEY=your_payment_gateway_key
   
   # Server
   PORT=3000
   ```

4. **Firebase Setup**
   - Create a Firebase project
   - Enable Authentication
   - Generate service account key
   - Encode the key in base64 and add to `.env`

5. **MongoDB Setup**
   - Create MongoDB Atlas cluster
   - Get connection string
   - Add credentials to `.env`

6. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📁 Project Structure

```
developer-community-platform/
├── 📁 client/                 # Frontend React application
├── 📁 server/                 # Backend Express server
│   ├── 📁 middleware/         # Authentication middleware
│   ├── 📁 routes/            # API routes
│   └── 📄 server.js          # Main server file
├── 📄 package.json           # Dependencies and scripts
├── 📄 .env                   # Environment variables
└── 📄 README.md              # Project documentation
```

## 🔗 API Endpoints

### Posts
- `GET /allPostsData` - Get all posts with pagination and filtering
- `POST /posts` - Create a new post
- `GET /posts/:id` - Get a specific post
- `DELETE /posts/:id` - Delete a post (author only)
- `PATCH /posts/:id/vote/up` - Upvote a post
- `PATCH /posts/:id/vote/down` - Downvote a post

### Comments
- `POST /comments` - Create a comment
- `GET /comments/:postId` - Get comments for a post
- `POST /comments/:commentId/report` - Report a comment
- `DELETE /comments/:commentId` - Delete a comment

### Users
- `POST /users` - Create user account
- `GET /users/:uid` - Get user profile
- `PATCH /users/:uid` - Update user profile
- `PATCH /users/:uid/upgrade-to-member` - Upgrade to premium

### Admin
- `GET /users` - Get all users (admin only)
- `PATCH /users/:uid/make-admin` - Promote user to admin
- `GET /reported-comments` - Get reported comments
- `POST /announcements` - Create announcement

### Payments
- `POST /create-payment-intent` - Create Stripe payment intent

## 🎯 Usage Examples

### Creating a Post
```javascript
const newPost = {
  authorName: "John Doe",
  authorEmail: "john@example.com",
  postTitle: "How to use React Hooks?",
  postDescription: "I'm having trouble understanding useEffect...",
  tags: ["react", "javascript", "hooks"]
};

fetch('/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newPost)
});
```

### Voting on a Post
```javascript
// Upvote
fetch(`/posts/${postId}/vote/up`, { method: 'PATCH' });

// Downvote  
fetch(`/posts/${postId}/vote/down`, { method: 'PATCH' });
```

## 🔐 Authentication

The platform uses Firebase Authentication with the following flow:

1. **User Registration/Login** - Handled by Firebase Auth
2. **Token Verification** - Custom middleware verifies Firebase tokens
3. **Role-based Access** - Different permissions based on user roles
4. **Protected Routes** - Middleware protects sensitive endpoints

### User Roles
- **User** - Basic access, limited to 5 posts
- **Member** - Premium subscriber, unlimited posts
- **Admin** - Full platform management access

## 💳 Premium Membership

Users can upgrade to premium membership via Stripe integration:

- **Price**: $20 USD
- **Benefits**: 
  - Unlimited posts
  - Priority support
  - Advanced features
- **Payment**: Secure Stripe checkout
- **Instant Activation** - Immediate role upgrade after payment

## 🛡️ Security Features

- **Firebase Token Validation** - Secure API access
- **Email Verification** - Ensures users own their email accounts  
- **CORS Configuration** - Prevents unauthorized cross-origin requests
- **Input Validation** - Prevents malicious data injection
- **Role-based Permissions** - Restricts access to sensitive operations

## 📱 Responsive Design

The platform is fully responsive and optimized for:
- 📱 Mobile devices (320px+)
- 📱 Tablets (768px+)
- 💻 Desktops (1024px+)
- 🖥️ Large screens (1440px+)


