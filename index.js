var express = require("express");
var https = require("https");
var http = require("http");
var app = express();
const { Server } = require("socket.io");
var fs = require("fs");
const Phea = require("phea");
const mdns = require("mdns");

process.on("SIGINT", () => {
  // Stop example with ctrl+c
  console.log("SIGINT Detected. Shutting down...");
  bridges.forEach((bridge, index) => {
    if (bridge.bridge) {
      console.log(`stopping bridge #${index}...`);
      bridge.bridge.stop();
      console.log(`stopped bridge #${index}`);
    }
  });
});

let philipsHueBridgesInformation;
async function getPhilipsHueBridgesInformation() {
  try {
    const data = await fs.promises.readFile(
      "philips-hue-bridges-information.json",
      "utf8"
    );
    philipsHueBridgesInformation = JSON.parse(data);
    console.log("philipsHueBridgesInformation", philipsHueBridgesInformation);
  } catch (error) {
    console.error("Error getting philips hue bridges information:", error);
    // throw error;
  }
}
async function savePhilipsHueBridgesInformation() {
  try {
    await fs.promises.writeFile(
      "philips-hue-bridges-information.json",
      JSON.stringify(philipsHueBridgesInformation, null, 2),
      "utf8"
    );
    console.log("bridge information saved successfully.");
  } catch (error) {
    console.error("Error saving bridge information:", error);
    // throw error;
  }
}

const bridges = [];

function discoverBridges() {
  const browser = mdns.createBrowser(mdns.tcp("hue"));
  browser.on("serviceUp", (service) => {
    //console.log("Found a Philips Hue bridge:", service);
    const { name, txtRecord } = service;
    const { bridgeid, modelid } = txtRecord;
    const ip = service.addresses[service.addresses.length - 1];
    const discoveredBridge = { name, id: bridgeid, ip };
    onDiscoverdBridge(discoveredBridge);
  });

  browser.on("error", (error) => {
    console.error("Error while discovering Philips Hue bridges:", error);
  });

  browser.start();
}

function onDiscoverdBridge(discoveredBridge) {
  const { name, id, ip } = discoveredBridge;
  if (!philipsHueBridgesInformation[id]) {
    philipsHueBridgesInformation[id] = {};
  }
  const { credentials } = philipsHueBridgesInformation[id];
  const bridge = {
    name,
    id,
    ip,
    credentials,
  };
  bridges.push(bridge);
  io.emit("bridges", bridges);
}

async function setupBridges() {
  bridges.length = 0;
  await getPhilipsHueBridgesInformation();
  if (!philipsHueBridgesInformation) {
    console.log("no philips hue bridges information");
    philipsHueBridgesInformation = {};
    await savePhilipsHueBridgesInformation();
  }

  discoverBridges();
}
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

  socket.emit("bridges", bridges);

  socket.on("discoverBridges", () => setupBridges());

  socket.on("getCredentials", async (ip, response) => {
    const bridge = bridges.find((bridge) => bridge.ip == ip);
    let credentials;
    if (bridge) {
      try {
        credentials = await Phea.register(ip);
        if (credentials) {
          console.log("successfully got credentials", credentials);
          bridge.credentials = credentials;
          philipsHueBridgesInformation[bridge.id].credentials = credentials;
          savePhilipsHueBridgesInformation();
        }
      } catch (error) {
        if (error instanceof Promise) {
          error = await error;
        }
        console.log("error getting credentials", error);
      }
    }
    response(credentials);
  });

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
