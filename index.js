var express = require("express");
var https = require("https");
var http = require("http");
var app = express();
var WebSocket = require("ws");
var fs = require("fs");
const Phea = require("phea");
const philipsHueCredentials = require("./philips-hue-credentials");

let running = true;
process.on("SIGINT", () => {
  // Stop example with ctrl+c
  console.log("SIGINT Detected. Shutting down...");
  running = false;
});

async function basicExample() {
  let groupId = 200;
  let transitionTime = 200; // milliseconds

  let bridge = await Phea.bridge(philipsHueCredentials);
  let groups = await bridge.getGroup(groupId); // 0 will fetch all groups.
  console.log(groups);

  await bridge.start(groupId);
  while (running) {
    let color = [
      // Generate Random RGB Color Array
      Math.floor(55 + Math.random() * Math.floor(200)),
      Math.floor(55 + Math.random() * Math.floor(200)),
      Math.floor(55 + Math.random() * Math.floor(200)),
    ];

    // Set all lights to random color.
    bridge.transition(0, color, transitionTime);

    // Sleep until next color update is needed.
    await new Promise((resolve) => setTimeout(resolve, transitionTime));
  }

  bridge.stop();
}

basicExample();

var options = {
  key: fs.readFileSync("./sec/key.pem"),
  cert: fs.readFileSync("./sec/cert.pem"),
};

app.use(function (req, res, next) {
  res.header("Cross-Origin-Embedder-Policy", "require-corp");
  res.header("Cross-Origin-Opener-Policy", "same-origin");
  next();
});
app.use(express.static("public"));

return;
const httpServer = http.createServer(app);
httpServer.listen(80);
const httpsServer = https.createServer(options, app);
httpsServer.listen(443, () => {
  console.log("server listening on https://localhost");
});

const wss = new WebSocket.Server({ server: httpServer });
wss.on("connection", (ws) => {
  console.log("new ws connection");
  ws.on("message", (data) => {
    const string = data.toString();
    const message = JSON.parse(string);
    console.log("ws message received", message);
    const { to, type } = message;
    switch (type) {
      default:
        console.log(`uncaught message type ${type}`);
        break;
    }
  });
  ws.on("close", () => {
    console.log("client left");
  });
});
