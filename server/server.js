const path = require('path');
const express = require('express');
const app = express();
const port = 3000;
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const karaoke = require('./apps/karaoke/app');
const trueColors = require('./apps/true-colors/app');
const acronym = require('goodword-acronym');

karaoke.init(io.of('karaoke'));
trueColors.init(io.of('trueColors'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get('/whoami', (req, res) => {
  res.send({ip: req.header('X-Real-IP') || req.connection.remoteAddress});
});

app.get('/acronym', (req, res) => {
  res.send({text: acronym("thanos")});
});

app.get('/socket.io/socket.io.js', (req, res) => {
  res.sendFile(path.join(__dirname, "node_modules/socket.io-client/dist/socket.io.js"));
});

app.use(express.static(path.join(__dirname, "public")));

app.use('/karaoke', karaoke.app);
app.use('/trueColors', trueColors.app);

server.listen(port, () => {
  console.log(`App listening on port ${port}!`);
});
