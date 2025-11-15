---
# **YoChat — Full-Stack Chat Application**

React Native (Expo) + Node.js + Express + Socket.io + JWT

YoChat is a real-time chat application built with a **React Native frontend** and a **Node/Express backend**, connected via **Socket.io**. It supports authentication, real-time messaging, and conversation management.
---

# 🚀 **Tech Stack**

## **Frontend (React Native + Expo)**

- React Native / Expo Router
- TypeScript
- Context API
- Custom UI components
- Socket.io-client

## **Backend (Node.js + Express)**

- Express.js
- MongoDB + Mongoose
- Socket.io
- JSON Web Tokens (JWT)
- Modular controllers, routes, utilities

---

# 📂 **Project Structure**

```
app/
   frontend/
      YoChat/          # React Native app
         app/
         components/
         constants/
         contexts/
         services/
         socket/
         utils/
         assets/
         package.json
   backend/
      controllers/
      models/
      routes/
      socket/
      utils/
      db.js
      index.js
      package.json
```

---

# 🛠 **Backend Setup**

### 1. Navigate to backend

```bash
cd app/backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env` file

(you can also create this manually)

```
MONGO_URI=your_mongo_connection_string
JWT_SECRET=your_secret_key
```

### 4. Start backend (dev mode)

```bash
npm run dev
```

Your backend should now be running at:

```
http://localhost:5000
```

---

# 📱 **Frontend Setup (React Native / Expo)**

### 1. Navigate to frontend

```bash
cd app/frontend/YoChat
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start Expo

```bash
npx expo start
```

You can open the app using:

- Expo Go (Android/iOS)
- Android Studio emulator
- iOS Simulator (Mac)

---

# 🔌 **Real-Time Features (Socket.io)**

The app supports real-time:

- Sending messages
- Receiving messages
- User online/offline status
- Conversation updates
- Typing indicators (optional if added)

The frontend connects using `socket.ts` and event names are organized in `socketEvents.ts`.

---

# 🔐 **Authentication**

Auth uses:

- JWT for secure stateless auth
- `/auth` routes for Login and Register
- React Native Context API for storing user data
- Backend protected routes using middleware

---

# ⚙️ **Scripts**

### **Backend**

```json
"scripts": {
  "start": "node index.js",
  "dev": "nodemon index.js"
}
```

### **Frontend**

Expo handles everything automatically.

---

# 📄 **Environment Variables**

### **Backend `.env`**

```
MONGO_URI=
JWT_SECRET=
```

### **Frontend**

You can create a `frontend/YoChat/.env` if needed (optional).

---

# 🎯 **Features**

- 🔐 User authentication (Register / Login)
- 💬 Real-time messaging
- 🧑‍🤝‍🧑 Group & private chat support
- 🟢 Online/offline statuses
- ✉️ Message history
- 📸 Avatar images
- 🎨 Clean UI with custom components

---

# 🧪 **API Endpoints**

### **Auth**

```
POST /auth/register
POST /auth/login
```

### **Messages**

```
GET /messages/:conversationId
POST /messages
```

### **Conversations**

```
GET /conversations/:userId
POST /conversations
```

---

# 🛡 **Security**

- JWT authentication
- Password hashing (recommended — bcrypt)
- CORS configured
- Sanitized request body

---

# 🤝 **Contributing**

Feel free to open issues or pull requests.

---

# 📜 License

This project is open-source — use freely.

---
