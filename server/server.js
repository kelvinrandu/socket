const express = require("express");
const cors = require("cors");
const app = express();
const socket = require("socket.io");
require("dotenv").config();

app.use(cors());
app.use(express.json());

const server = app.listen(process.env.PORT, () =>
  console.log(`Server started on ${process.env.PORT}`)
);

///////////////////////////////

const io = socket(server, {
  cors: {
    //origin: "http://localhost:3000",
    origin: "*",
    credentials: true,
  },
});

global.onlineUsers = new Map();
let onlineUsersArray = []

const NEW_CHAT_GROUP_MESSAGE_EVENT = "newChatGroupMessage"

io.on("connection", (socket) => {
  global.chatSocket = socket;

  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);

    !onlineUsersArray.some(user => user.userId === userId) &&
    onlineUsersArray.push({
      userId,
      socketId: socket.id
    })
    console.log('getOnlineUsers: ', onlineUsersArray);
    io.emit("getOnlineUsers", onlineUsersArray)
    
    // Broadcast user status change
    io.emit("user-status-change", { userId, status: true }); ///

    console.log('userId-' + userId + ': ', socket.id);
  });

//////////////////////////

socket.on("disconnect", () => {
  // Get the user ID associated with the disconnected socket
  onlineUsersArray = onlineUsersArray.filter((user) => user.socketId !== socket.id )
    io.emit("getOnlineUsers", onlineUsersArray)
  })

///////////////////////////////
  socket.on("send-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);

    console.log('receiver-' + data.to + ': ', sendUserSocket); //reciever socketid

    if (sendUserSocket) {
      // Create a message object with sender, receiver, and message content
      const message = {
        sender: socket.id, // Sender's socket ID
        receiver: data.to, // Receiver's user ID
        content: data.msg, // Message content
        timestamp: new Date(), // Timestamp of the message
      };

        socket.to(sendUserSocket).emit("msg-recieve", message);
        console.log('msg: ', message);
      
    }
  });
  //end-send-msg-event

  //group chat
  //join the socket to its own room
  const {groupId} = socket.handshake.query;
  socket.join(groupId);

  //listen for new messages from group channel
  socket.on(NEW_CHAT_GROUP_MESSAGE_EVENT, (data) => {
    io.in(groupId).emit(NEW_CHAT_GROUP_MESSAGE_EVENT, data)
  })

  //user leaves room, disconnects
  socket.on("disconnect", () => {
    console.log(`Client ${socket.id} disconnected`);
    socket.leave(groupId)
  })

  ////end of group chat/////////////////////////


  // Handle when a user sends a "typing" event
  // socket.on("typing", (data) => {
  //   const { senderId, receiverId } = data;
  //   const receiverSocket = onlineUsers.get(receiverId);

  //   console.log('typingSender: ', senderId);
    

  //   if (receiverSocket) {
  //     console.log('typingReceiver: ', receiverId);
  //     // Broadcast a "typing" event to the receiver
  //     socket.to(receiverSocket).emit("typing-user", { senderId });

  //     console.log('senderId - typing: ', senderId);
  //   }
  // });

  socket.on('typing', (typingUsers) => {
    socket.broadcast.emit('typingResponse', typingUsers)
    console.log('typingUsers: ', typingUsers);
  });

  

});

