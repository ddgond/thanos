const path = require('path');
const express = require('express');
const app = express();

const infoLog = (text) => {
  console.log("[True Colors]", text);
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.use(express.static(path.join(__dirname, "public")));

const rooms = {};

const getRoomState = (room) => {
  const state = {
    questions: room.questions,
    votes: room.votes,
    reveal: room.reveal,
    users: room.users.map(user => {return {id: user.id, name: user.name}})
  };
  return state;
}

const addQuestion = (question, room) => {
  room.questions.push(question);
}

const nextQuestion = (room) => {
  room.questions.shift();
  room.votes = [];
}

const init = (io) => {
  io.on('connection', function(socket) {
    infoLog('a user connected');
    let connectedRoom;

    socket.on('joinRoom', function(data) {
      const roomCode = data.roomCode;
      const ip = data.ip;
      const playerName = data.playerName;
      if (connectedRoom) {
        socket.leave(connectedRoom);
        infoLog(`user ${playerName} left room ${connectedRoom}`);
      }
      socket.join(roomCode);
      infoLog(`user ${playerName} joined room ${roomCode}`);
      connectedRoom = roomCode;
      if (!rooms[connectedRoom]) {
        rooms[connectedRoom] = {questions: [], votes: [], reveal: false, users: [{id: socket.id, name: playerName, ip: ip}]};
      }
      if (rooms[connectedRoom].users.filter((user) => user.ip === ip).length > 0) { // User is reconnecting
        user = rooms[connectedRoom].users.filter((user) => user.ip === ip)[0];
        for (vote in rooms[connectedRoom].votes) {
          if (vote.voterId === user.id) {
            vote.voterId = socket.id;
          }
          if (vote.voteeId === user.id) {
            vote.voteeId = socket.id;
          }
        }
        user.name = playerName;
        user.id = socket.id;
      } else {
        rooms[connectedRoom].users.push({id: socket.id, name: playerName, ip: ip});
      }
      io.to(connectedRoom).emit("statusUpdate", getRoomState(rooms[connectedRoom]));
    });

    socket.on('leaveRoom', function() {
      if (connectedRoom && rooms[connectedRoom].users.filter(user=>user.id===socket.id).length > 0) {
        let user = rooms[connectedRoom].users.filter(user=>user.id===socket.id)[0];
        socket.leave(connectedRoom);
        infoLog(`user ${user.name} left room ${connectedRoom}`);
        connectedRoom = null;
      }
    });

    socket.on('addQuestion', (data) => {
      if (connectedRoom && rooms[connectedRoom].users.filter(user=>user.id===socket.id).length > 0 && data.question) {
        if (rooms[connectedRoom].questions.length == 0) {
          rooms[connectedRoom].reveal = false;
        }
        addQuestion(data.question, rooms[connectedRoom]);
        io.to(connectedRoom).emit("statusUpdate", getRoomState(rooms[connectedRoom]));
      }
    });

    socket.on('nextQuestion', () => {
      if (connectedRoom && rooms[connectedRoom].users.filter(user=>user.id===socket.id).length > 0) {
        nextQuestion(rooms[connectedRoom]);
        rooms[connectedRoom].reveal = false;
        io.to(connectedRoom).emit("statusUpdate", getRoomState(rooms[connectedRoom]));
        io.to(connectedRoom).emit("nextQuestion");
      }
    });

    socket.on('vote', (data) => {
      if (connectedRoom && rooms[connectedRoom].users.filter(user=>user.id===socket.id).length > 0 && rooms[connectedRoom].users.filter(user=>user.id===data.voteeId).length > 0) {
        rooms[connectedRoom].votes = rooms[connectedRoom].votes.filter(vote => vote.voterId != socket.id);
        rooms[connectedRoom].votes.push({voterId: socket.id, voteeId: data.voteeId});
        io.to(connectedRoom).emit("statusUpdate", getRoomState(rooms[connectedRoom]));
      }
    });

    socket.on('revealResults', () => {
      if (connectedRoom && rooms[connectedRoom].users.filter(user=>user.id===socket.id).length > 0) {
        rooms[connectedRoom].reveal = true;
        io.to(connectedRoom).emit("statusUpdate", getRoomState(rooms[connectedRoom]));
      }
    });

    socket.on('disconnect', function(reason) {
      infoLog(`a user disconnected due to ${reason}`);
    });
  });
}

module.exports = {
  init: init,
  app: app
}
