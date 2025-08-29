# Simplified Portainer Deployment Guide

## 🚀 Quick Deployment Steps

### Step 1: Clone the Repository on Your Server
```bash
git clone https://github.com/futureaiitofficial/travelconnect.git
cd travelconnect
```

### Step 2: Build the Frontend
```bash
# Install Node.js dependencies
npm install --legacy-peer-deps

# Build the Angular app
npm run build

# Create a directory for the frontend build
mkdir -p frontend-build
cp -r dist/* frontend-build/
```

### Step 3: Configure Portainer Stack

1. In Portainer, go to **Stacks** → **Add stack**
2. Name it `travelconnect`
3. Use **Web editor** method
4. Copy and paste the content of `docker-compose.portainer.yml`
5. Add these environment variables:

```
MONGODB_URI=mongodb+srv://lahari:9R8En3qh7Csjd8Ve@travelconnect.jovulzu.mongodb.net/travelconnect?retryWrites=true&w=majority&appName=travelconnect
JWT_SECRET=travelconnect_super_secret_jwt_key_2024
```

### Step 4: Deploy the Stack
Click **Deploy the stack**

## 📝 Alternative Approach

If you continue to face build issues in Portainer, try this manual approach:

1. Build the frontend locally:
```bash
npm install --legacy-peer-deps
npm run build
```

2. Create a Docker volume for the frontend build:
```bash
docker volume create travelconnect_frontend_build
```

3. Copy the built files to the volume:
```bash
# Create a temporary container to access the volume
docker run --rm -v travelconnect_frontend_build:/data -v $(pwd)/dist:/source alpine cp -r /source/* /data
```

4. Deploy using the simplified docker-compose.portainer.yml file that uses pre-built frontend

## 🔧 Troubleshooting

If you still encounter issues:

1. Try using the pre-built Docker image approach:
   - Build the frontend image locally
   - Push to Docker Hub
   - Use that image in your docker-compose file

2. Check Portainer logs for specific error messages

3. Try increasing the memory limit in Portainer settings
