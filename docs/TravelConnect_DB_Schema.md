
# 📦 Travel Connect – Database Schema (MongoDB)

This document defines the MongoDB schema (collections and fields) for the **Travel Connect** social media platform for travelers.

---

## 📁 1. Users Collection (`users`)

```json
{
  "_id": "ObjectId",
  "username": "String",
  "email": "String",
  "password": "String",
  "fullName": "String",
  "profilePicture": "String",
  "bio": "String",
  "interests": ["String"],
  "travelHistory": ["String"],
  "followers": ["ObjectId"],
  "following": ["ObjectId"],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

## 📁 2. Posts Collection (`posts`)

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "caption": "String",
  "media": ["String"],
  "location": {
    "name": "String",
    "lat": "Number",
    "lng": "Number"
  },
  "hashtags": ["String"],
  "likes": ["ObjectId"],
  "commentsCount": "Number",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

## 📁 3. Comments Collection (`comments`)

```json
{
  "_id": "ObjectId",
  "postId": "ObjectId",
  "userId": "ObjectId",
  "commentText": "String",
  "createdAt": "Date"
}
```

---

## 📁 4. Messages Collection (`messages`)

```json
{
  "_id": "ObjectId",
  "conversationId": "ObjectId",
  "senderId": "ObjectId",
  "receiverId": "ObjectId",
  "messageText": "String",
  "read": "Boolean",
  "createdAt": "Date"
}
```

---

## 📁 5. Conversations Collection (`conversations`)

```json
{
  "_id": "ObjectId",
  "members": ["ObjectId"],
  "isGroup": "Boolean",
  "groupName": "String",
  "lastMessageAt": "Date"
}
```

---

## 📁 6. Trips Collection (`trips`)

```json
{
  "_id": "ObjectId",
  "createdBy": "ObjectId",
  "tripName": "String",
  "startDate": "Date",
  "endDate": "Date",
  "itinerary": [
    {
      "day": "Number",
      "title": "String",
      "location": "String",
      "notes": "String"
    }
  ],
  "checklist": [
    {
      "item": "String",
      "isDone": "Boolean"
    }
  ],
  "members": ["ObjectId"],
  "isPublic": "Boolean",
  "createdAt": "Date"
}
```

---

## 📁 7. Notifications Collection (`notifications`)

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "senderId": "ObjectId",
  "type": "String",
  "referenceId": "ObjectId",
  "isRead": "Boolean",
  "createdAt": "Date"
}
```

---

## 📁 8. Locations Collection (`locations`) _(optional)_

```json
{
  "_id": "ObjectId",
  "name": "String",
  "lat": "Number",
  "lng": "Number",
  "country": "String",
  "trendingScore": "Number",
  "postCount": "Number"
}
```

---

## 📁 9. Hashtags Collection (`hashtags`) _(optional)_

```json
{
  "_id": "ObjectId",
  "name": "String",
  "usageCount": "Number",
  "relatedPosts": ["ObjectId"]
}
```

---

## 📁 10. Reports Collection (`reports`)

```json
{
  "_id": "ObjectId",
  "reporterId": "ObjectId",
  "reportedType": "String",
  "reportedId": "ObjectId",
  "reason": "String",
  "createdAt": "Date"
}
```

---

## 🧠 Indexing Recommendations

- `userId` in `posts`, `comments`, `notifications`
- Geospatial index on `location.lat` and `location.lng`
- Text index on `caption`, `hashtags`, `bio`
- Compound index on `conversationId` + `createdAt` in `messages`

---
