# 🔐 TravelConnect Authentication API

Complete authentication system with JWT tokens, role-based access control, and comprehensive validation.

## 🚀 **Features**

- ✅ **User Registration** with validation
- ✅ **User Login** with JWT tokens
- ✅ **Protected Routes** with middleware
- ✅ **Role-based Access** (user/admin)
- ✅ **Password Management** (change, reset)
- ✅ **Profile Management**
- ✅ **Refresh Tokens** for security
- ✅ **Input Validation** with express-validator
- ✅ **Welcome Notifications** on registration
- ✅ **Admin Statistics** and management

## 📡 **API Endpoints**

### **Public Routes**

#### `POST /api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "firstName": "Alice",
  "lastName": "Traveler",
  "username": "alicetraveler",
  "email": "alice@travelconnect.com",
  "password": "Password123",
  "fullName": "Alice Traveler", // optional
  "bio": "Adventure seeker", // optional
  "interests": ["hiking", "photography"], // optional
  "travelHistory": ["Paris", "Tokyo"] // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "username": "alicetraveler",
    "email": "alice@travelconnect.com",
    "fullName": "Alice Traveler",
    "role": "user",
    // ... other user fields
  }
}
```

#### `POST /api/auth/login`
Authenticate user and receive JWT tokens.

**Request Body:**
```json
{
  "email": "alice@travelconnect.com", // or username
  "password": "Password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { /* user object */ }
}
```

#### `POST /api/auth/forgot-password`
Request password reset.

**Request Body:**
```json
{
  "email": "alice@travelconnect.com"
}
```

#### `PUT /api/auth/reset-password/:resettoken`
Reset password using reset token.

**Request Body:**
```json
{
  "password": "NewPassword123"
}
```

#### `POST /api/auth/refresh-token`
Get new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### **Protected Routes** (Require Authentication)

#### `GET /api/auth/me`
Get current user information.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "username": "alicetraveler",
    "email": "alice@travelconnect.com",
    "fullName": "Alice Traveler",
    "followers": [],
    "following": [],
    // ... complete user object with populated fields
  }
}
```

#### `PUT /api/auth/profile`
Update user profile.

**Request Body:**
```json
{
  "firstName": "Alice",
  "lastName": "Explorer",
  "fullName": "Alice Explorer",
  "bio": "Updated bio",
  "interests": ["hiking", "photography", "culture"],
  "profilePicture": "https://example.com/avatar.jpg"
}
```

#### `PUT /api/auth/change-password`
Change user password.

**Request Body:**
```json
{
  "currentPassword": "Password123",
  "newPassword": "NewPassword456"
}
```

#### `POST /api/auth/logout`
Logout user and clear refresh token.

### **Admin Routes** (Require Admin Role)

#### `GET /api/auth/stats`
Get user statistics (admin only).

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 3,
    "activeUsers": 3,
    "adminUsers": 1,
    "verifiedUsers": 0,
    "newUsers": 3,
    "recentlyActive": 3,
    "inactiveUsers": 0
  }
}
```

## 🔒 **Authentication Middleware**

### **protect**
Requires valid JWT token in Authorization header.

```javascript
// Usage in routes
router.get('/protected', protect, controller);
```

### **requireAdmin**
Requires user to have admin role.

```javascript
// Usage in routes
router.get('/admin-only', protect, requireAdmin, controller);
```

### **authorize(...roles)**
Allow specific roles.

```javascript
// Usage in routes
router.get('/multi-role', protect, authorize('admin', 'moderator'), controller);
```

### **optionalAuth**
Adds user to request if token provided, but doesn't require authentication.

```javascript
// Usage in routes
router.get('/optional', optionalAuth, controller);
```

## ✅ **Validation Rules**

### **Registration Validation**
- `firstName`: 2-50 chars, letters only
- `lastName`: 2-50 chars, letters only
- `username`: 3-30 chars, alphanumeric + underscore, starts with letter
- `email`: Valid email format
- `password`: Min 6 chars, must contain uppercase, lowercase, and number
- `interests`: Optional array, max 20 items
- `travelHistory`: Optional array, max 50 items

### **Login Validation**
- `email`: Required (accepts email or username)
- `password`: Required, min 6 chars

### **Password Change Validation**
- `currentPassword`: Required
- `newPassword`: Same rules as registration, must be different from current

## 🛡️ **Security Features**

1. **Password Hashing**: bcrypt with salt rounds
2. **JWT Tokens**: Secure token generation with expiration
3. **Refresh Tokens**: Long-lived tokens for token renewal
4. **Input Validation**: Comprehensive validation with express-validator
5. **Role-based Access**: User/admin role separation
6. **Account Status**: Active/inactive user management
7. **Login Tracking**: Last login timestamp
8. **Error Handling**: Secure error messages

## 📊 **Database Integration**

### **User Roles**
- **`user`** (default): Regular travelers
- **`admin`**: Application administrators

### **User Status**
- **`isActive`**: Account active/deactivated
- **`isVerified`**: Email verification status
- **`lastLogin`**: Last login timestamp

### **Notifications**
- Welcome notification created on registration
- Admin promotion notifications
- System notifications

## 🧪 **Testing Examples**

### Register User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Alice",
    "lastName": "Traveler",
    "username": "alicetraveler",
    "email": "alice@travelconnect.com",
    "password": "Password123",
    "bio": "Adventure seeker",
    "interests": ["hiking", "photography"]
  }'
```

### Login User
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@travelconnect.com",
    "password": "Password123"
  }'
```

### Access Protected Route
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Admin Route (with admin token)
```bash
curl -X GET http://localhost:3001/api/auth/stats \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

## ⚡ **Current Status**

✅ **Authentication System**: Fully implemented and tested
✅ **User Registration**: Working with validation
✅ **User Login**: JWT tokens generated successfully
✅ **Protected Routes**: Middleware working correctly
✅ **Admin Access**: Role-based restrictions enforced
✅ **Database Integration**: 3 users, 2 notifications created
✅ **Validation**: Input validation preventing invalid data

## 🎯 **Next Steps**

1. **Implement other controllers** (posts, trips, messages)
2. **Add file upload** for profile pictures
3. **Email integration** for password reset
4. **Social features** (follow/unfollow)
5. **Connect frontend** to authentication APIs

The authentication foundation is solid and ready for the full application! 🚀
