FROM nginx:stable

# Copy nginx configuration
COPY default.conf /etc/nginx/conf.d/default.conf

# Create a directory for the frontend files
RUN mkdir -p /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
