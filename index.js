var express = require("express");
var https = require("https");
var http = require("http");
var app = express();
const { Server } = require("socket.io");
var fs = require("fs");
const Phea = require("phea");

process.on("SIGINT", () => {
  // Stop example with ctrl+c
  console.log("SIGINT Detected. Shutting down...");
  bridges.forEach((bridge, index) => {
    console.log(`stopping bridge #${index}...`);
    bridge.stop();
    console.log(`stopped bridge #${index}`);
  });
});

const bridges = [];
async function setupBridges() {}
setupBridges();

var options = {
  key: fs.readFileSync("./sec/key.pem"),
  cert: fs.readFileSync("./sec/cert.pem"),
};

app.use(function (req, res, next) {
  res.header("Cross-Origin-Opener-Policy", "same-origin");
  res.header("x-frame-options", "same-origin");

  next();
});
app.use(express.static("public"));

const httpServer = http.createServer(app);
httpServer.listen(80);
const httpsServer = https.createServer(options, app);
httpsServer.listen(443, () => {
  console.log("server listening on https://localhost");
});

const io = new Server(httpsServer, {
  cors: {
    origin: "*",
  },
});
io.on("connection", (socket) => {
  console.log("new client");

  socket.on("lights", (message) => {
    const { lights } = message;
    lights.forEach(({ light: lightIndex, bridge: bridgeIndex, color }) => {
      const bridge = bridges[bridgeIndex];
      if (bridge) {
        // console.log(
        //   `setting light #${lightIndex} of bridge #${bridgeIndex} to ${color}...`
        // );
        bridge.transition(lightIndex, color);
      }
    });
  });
  socket.on("disconnect", () => {
    console.log("client left");
  });
});
