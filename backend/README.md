# TravelConnect Backend API

Backend API for TravelConnect - A Social Media Platform for Travelers

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with refresh tokens
- **Real-time Communication**: Socket.IO for chat and notifications
- **Social Features**: Posts, comments, likes, follow system
- **Trip Planning**: Collaborative trip planning with itineraries
- **File Upload**: Media upload with multer
- **Security**: Helmet, CORS, rate limiting, input validation
- **Database**: MongoDB with Mongoose ODM

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Real-time**: Socket.IO
- **Security**: Helmet, bcryptjs, express-rate-limit
- **File Upload**: Multer
- **Validation**: express-validator
- **Environment**: dotenv

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/             # Route controllers (to be implemented)
├── middleware/
│   ├── auth.js             # Authentication middleware
│   └── errorHandler.js     # Global error handler
├── models/                 # Mongoose schemas (to be implemented)
├── routes/
│   ├── auth.js            # Authentication routes
│   ├── users.js           # User management routes
│   ├── posts.js           # Posts and feed routes
│   ├── comments.js        # Comments routes
│   ├── trips.js           # Trip planning routes
│   ├── messages.js        # Messaging routes
│   └── notifications.js   # Notifications routes
├── utils/
│   └── generateToken.js   # JWT utilities
├── uploads/               # File upload directory
├── .env                   # Environment variables
├── .env.example          # Environment template
├── server.js             # Main server file
└── package.json          # Dependencies and scripts
```

## 🔧 Installation & Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start MongoDB** (make sure MongoDB is running locally or provide remote URI)

4. **Run the server**:
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Forgot password
- `PUT /api/auth/reset-password/:token` - Reset password
- `POST /api/auth/refresh-token` - Refresh JWT token

### Users
- `GET /api/users` - Get all users
- `GET /api/users/profile/:id` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/follow/:id` - Follow user
- `DELETE /api/users/follow/:id` - Unfollow user
- `GET /api/users/followers/:id` - Get user followers
- `GET /api/users/following/:id` - Get user following
- `GET /api/users/search` - Search users

### Posts
- `GET /api/posts` - Get feed posts
- `POST /api/posts` - Create new post
- `GET /api/posts/:id` - Get single post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like/unlike post
- `GET /api/posts/user/:userId` - Get posts by user
- `GET /api/posts/hashtag/:hashtag` - Get posts by hashtag
- `GET /api/posts/location/:location` - Get posts by location

### Comments
- `GET /api/comments/post/:postId` - Get comments for post
- `POST /api/comments` - Create comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment
- `POST /api/comments/:id/like` - Like/unlike comment

### Trips
- `GET /api/trips` - Get all trips
- `POST /api/trips` - Create new trip
- `GET /api/trips/:id` - Get single trip
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip
- `POST /api/trips/:id/invite` - Invite users to trip
- `GET /api/trips/:id/collaborators` - Get trip collaborators
- `POST /api/trips/:id/itinerary` - Add itinerary item
- `PUT /api/trips/itinerary/:itemId` - Update itinerary item
- `DELETE /api/trips/itinerary/:itemId` - Delete itinerary item
- `GET /api/trips/user/:userId` - Get trips by user

### Messages
- `GET /api/messages/conversations` - Get user conversations
- `POST /api/messages/conversations` - Create conversation
- `GET /api/messages/conversations/:id` - Get conversation messages
- `POST /api/messages/conversations/:id/messages` - Send message
- `PUT /api/messages/messages/:id/read` - Mark message as read
- `DELETE /api/messages/messages/:id` - Delete message

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/mark-all-read` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Delete notification
- `GET /api/notifications/unread-count` - Get unread notification count

## 📱 Socket.IO Events

### Connection
- `connection` - User connects
- `disconnect` - User disconnects

### User Rooms
- `join-user-room` - Join personal notification room
- `join-trip-room` - Join trip collaboration room

### Messaging
- `send-message` - Send chat message
- `new-message` - Receive new message
- `typing` - Typing indicator
- `user-typing` - Receive typing indicator

## 🔒 Environment Variables

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/travelconnect

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here
JWT_REFRESH_EXPIRES_IN=30d

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
FRONTEND_URL=http://localhost:4200

# Socket.IO Configuration
SOCKET_CORS_ORIGIN=http://localhost:4200
```

## 🔄 Development Status

### ✅ Completed
- [x] Basic server setup with Express
- [x] MongoDB connection configuration
- [x] JWT authentication middleware
- [x] Socket.IO setup for real-time features
- [x] Route structure with placeholders
- [x] Error handling middleware
- [x] Security middleware (helmet, cors, rate limiting)
- [x] File upload configuration

### 🔲 Next Steps (Controllers & Models)
- [ ] User model and authentication controller
- [ ] Post model and controller
- [ ] Comment model and controller
- [ ] Trip model and controller
- [ ] Message model and controller
- [ ] Notification model and controller
- [ ] File upload functionality
- [ ] Input validation
- [ ] Testing setup

## 🚀 Getting Started

The backend server is now ready for development. Run `npm run dev` to start the server in development mode with auto-restart on file changes.

The server will be available at `http://localhost:5000` with a health check endpoint at `/health`.
