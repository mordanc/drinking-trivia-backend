const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
  },
});
const cors = require("cors");

const PORT = process.env.PORT || 5000;

app.use(cors());
app.get("/", (req, res) => {
  res.send("trivia backend");
});

const usernames = [];
const rooms = ["room1", "room2"];
io.on("connection", (socket) => {
  console.log("a user connected");
  // when the client emits 'adduser', this listens and executes
  socket.on("addUser", function (username) {
    console.log("user added");
    // store the username in the socket session for this client
    socket.username = username;
    // store the room name in the socket session for this client
    socket.room = "room1";
    // add the client's username to the global list
    usernames[username] = username;
    // send client to room 1
    socket.join("room1");
    // echo to client they've connected
    socket.emit("updateChat", "SERVER", "Connected to room1");
    // echo to room 1 that a person has connected to their room
    socket.broadcast
      .to("room1")
      .emit("updateChat", "SERVER", username + " has connected to this room");
    socket.emit("updaterooms", rooms, "room1");
  });

  // when the client emits 'sendchat', this listens and executes
  socket.on("sendchat", function (data) {
    // we tell the client to execute 'updateChat' with 2 parameters
    io.sockets.in(socket.room).emit("updateChat", socket.username, data);
  });

  socket.on("switchRoom", function (newroom) {
    console.log("user switching room");
    // leave the current room (stored in session)
    socket.leave(socket.room);
    // join new room, received as function parameter
    socket.join(newroom);
    socket.emit(
      "switchRoomSuccess",
      newroom,
      "You have connected to " + newroom
    );
    // sent message to OLD room
    socket.broadcast
      .to(socket.room)
      .emit(
        "userLeft",
        { name: socket.username, id: socket.id },
        socket.username + " has left this room"
      );
    // update socket session room title
    socket.room = newroom;
    socket.broadcast
      .to(newroom)
      .emit(
        "userJoined",
        { name: socket.username, id: socket.id },
        socket.username + " has joined this room"
      );
    socket.emit("updaterooms", rooms, newroom);
    socket.emit("joined");

    const roomSize = io.sockets.adapter.rooms.get(newroom).size;
    if (roomSize === 1) {
      socket.emit("hostMessage", true);
    } else {
      socket.emit("hostMessage", false);
    }
  });

  // client that is not the host requests new question, notify host to send question
  socket.on("requestCurrentQuestion", () => {
    console.log("client requesting question");
    socket.broadcast.to(socket.room).emit("sendNewQuestion");
  });

  socket.on("sendingQuestion", (question) => {
    console.log("client sending question", question);
    socket.broadcast.to(socket.room).emit("receiveQuestion", question);
  });

  socket.on("updateCurrentQuestion", (questionObject) => {
    console.log("updateCurrentQuestion", questionObject);
    console.log("room", socket.room);
    socket.broadcast.to(socket.room).emit("receiveNewQuestion", questionObject);
  });

  socket.on("selectChoice", (choice) => {
    console.log("selectChoice", choice);
    socket.broadcast.to(socket.room).emit("selectChoice", choice);
  });
});

http.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
