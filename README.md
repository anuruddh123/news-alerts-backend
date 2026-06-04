# News Alerts Backend

Backend API for the News Alerts application.

## Features

- JWT Authentication
- MongoDB Atlas Integration
- Email Notifications
- Push Notifications
- Socket.io Real-time Updates

## Tech Stack

- Node.js
- Express.js
- MongoDB Atlas
- JWT
- Nodemailer
- Socket.io

## Setup

```bash
npm install
npm run dev
```

## Environment Variables

Create a `.env` file:

```env
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=2525
EMAIL_USER=your_smtp_user
EMAIL_PASS=your_smtp_key
```

## Deployment

Render