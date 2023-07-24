var express = require("express");
var https = require("https");
var http = require("http");
var app = express();
var WebSocket = require("ws");
var fs = require("fs");
const Phea = require("phea");
const philipsHueCredentials = require("./philips-hue-credentials");

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
async function setupBridges() {
  philipsHueCredentials.forEach(async (credentials, index) => {
    console.log(`setting up bridge #${index}...`);
    const bridge = await Phea.bridge(credentials);
    bridges.push(bridge);
    const { groupId } = credentials;
    const group = await bridge.getGroup(groupId);
    console.log("group", group);
    await bridge.start(groupId);
    console.log(`set up bridge #${index}`);
  });
}
setupBridges();

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
    const { type } = message;
    switch (type) {
      case "lights":
        const { lights } = message;
        lights.forEach(({ light: lightIndex, bridge: bridgeIndex, color }) => {
          const bridge = bridges[bridgeIndex];
          console.log(
            `setting light #${lightIndex} of bridge #${bridgeIndex} to ${color}...`
          );
          bridge.transition(lightIndex, color);
        });
        break;
      default:
        console.log(`uncaught message type ${type}`);
        break;
    }
  });
  ws.on("close", () => {
    console.log("client left");
  });
});
