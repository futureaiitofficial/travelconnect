# MongoDB Setup Options for TravelConnect Backend

## Option 1: Local MongoDB Installation (Recommended for Development)

### macOS (using Homebrew):
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb/brew/mongodb-community

# Verify MongoDB is running
mongosh --eval "db.adminCommand('ismaster')"
```

### Alternative using Docker:
```bash
# Run MongoDB in Docker
docker run --name mongodb -d -p 27017:27017 mongo:latest

# Connect to verify
docker exec -it mongodb mongosh
```

## Option 2: MongoDB Atlas (Cloud Database)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster
4. Get your connection string
5. Update your `.env` file:

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/travelconnect?retryWrites=true&w=majority
```

## Option 3: Continue Development Without Database

The server is configured to run without MongoDB for initial development. You can:
- Focus on frontend development first
- Set up database later
- Use mock data for testing

## Current Status

✅ **Backend Server**: Running on http://localhost:3001
✅ **API Routes**: All endpoints responding with placeholder messages
⚠️ **Database**: Optional - server runs without it
🔄 **Next**: Choose your preferred MongoDB setup option

## Test Your Setup

```bash
# Health check
curl http://localhost:3001/health

# Test API endpoints
curl -X POST http://localhost:3001/api/auth/login
curl http://localhost:3001/api/users
curl http://localhost:3001/api/posts
```
