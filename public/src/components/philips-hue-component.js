AFRAME.registerSystem("philips-hue", {
  schema: {
    mode: {
      default: "glow",
      oneOf: [
        "none",
        "scene",
        "glow",
        "gaze",
        "flashlight",
        "torch",
        "virtual",
      ],
    },
    colorDifferenceThreshold: { type: "number", default: 0.01 },
    intensityScalar: { type: "number", default: 0.7 }, // 0.7
    virtualLights: {
      type: "selectorAll",
      default: "[data-virtual-light]",
    },
    debug: { type: "boolean", default: false },
    distanceThreshold: { type: "vec2", default: [0.1, 5] },
    angleThreshold: { type: "vec2", default: [0, Math.PI / 4] },
    flashlightDistanceThreshold: { type: "vec2", default: [0.1, 7] },
    flashlightAngleThreshold: { type: "vec2", default: [0, 0.6] },
    torchDistanceThreshold: { type: "vec2", default: [0.1, 1.1] },
    torchHueRange: { type: "vec2", default: [0.08, 0.15] },
    gazeDistanceThreshold: { type: "vec2", default: [0.1, 8] },
  },

  init: function () {
    this.isOculusBrowser = AFRAME.utils.device.isOculusBrowser();

    this.hintTextEntity = document.getElementById("hintText");

    window.philipsHueSystem = this;
    this.entities = [];
    this.tick = AFRAME.utils.throttleTick(this.tick, 1000 / 50, this);
    this.camera = document.getElementById("camera");
    this.cameraForward = document.getElementById("cameraForward");
    this.vector = new THREE.Vector3();
    this.cameraForwardPosition = new THREE.Vector3();
    this.flashlightForwardPosition = new THREE.Vector3();
    this.position = new THREE.Vector3();
    this.controllers = {
      left: document.getElementById("leftHandControls"),
      right: document.getElementById("rightHandControls"),
    };
    this.controllers.right.addEventListener(
      "abuttondown",
      this.onAButtonDown.bind(this)
    );
    this.controllers.right.addEventListener(
      "bbuttondown",
      this.onBButtonDown.bind(this)
    );
    this.controllers.left.addEventListener(
      "triggerdown",
      this.onLeftTriggerDown.bind(this)
    );

    this.controllers.right.addEventListener(
      "gripchanged",
      this.onGripChanged.bind(this)
    );
    this.controllers.left.addEventListener(
      "xbuttondown",
      this.onXButtonDown.bind(this)
    );
    this.controllers.left.addEventListener(
      "ybuttondown",
      this.onYButtonDown.bind(this)
    );
    this.controllers.right.addEventListener(
      "triggerdown",
      this.onRightTriggerDown.bind(this)
    );

    this.flashlight = document.getElementById("flashlight");
    this.flashlightPosition = new THREE.Vector3();
    this.flashlightForward = document.getElementById("flashlightForward");
    this.torch = document.getElementById("torch");
    this.flashlightIntensity = 0;

    this.torchFlame = document.getElementById("torchFlame");
    this.torchFlamePosition = new THREE.Vector3();

    this.onModeUpdate();
    this.setupSocketConnection();

    this.uiEntity = document.getElementById("ui");
    this.uiPosition = new THREE.Vector3();

    if (!this.isOculusBrowser) {
      setTimeout(() => {
        this.onPersistentAnchor();
        this.showUI();
      }, 500);
    }

    this.sceneContainer = document.querySelector("#sceneContainer");

    this.sceneEl.addEventListener("enter-vr", this.onEnterVR.bind(this));
    this.sceneEl.addEventListener("exit-vr", this.onExitVR.bind(this));

    this.currentMenu = "lights";
    this.uiMenuEntities = {};
    this.uiEntity.querySelectorAll("[data-ui-menu]").forEach((uiMenuEntity) => {
      this.uiMenuEntities[uiMenuEntity.dataset.uiMenu] = uiMenuEntity;
    });

    this.previousLightsEntity = document.getElementById("previousLights");
    this.lightsPageEntities = Array.from(
      document.querySelectorAll("[data-light]")
    );
    this.lightsPageEntities.forEach((lightsPageEntity) => {
      lightsPageEntity.addEventListener("click", () => {
        this.selectLight(lightsPageEntity._light);
      });
    });
    this.lightsPageIndex = 0;
    this.lightsPageIndexEntity = document.getElementById("lightsPageIndex");
    this.nextLightsEntity = document.getElementById("nextLights");

    this.onMenuUpdate();

    this.uiEntity.addEventListener("click", this.onUIClick.bind(this));

    this.sceneEl.addEventListener(
      "persistent-anchor",
      this.onPersistentAnchor.bind(this)
    );
    if (persistentAnchorsSystem.anchor) {
      this.onPersistentAnchor();
    }
  },

  onMenuUpdate: function () {
    for (const menu in this.uiMenuEntities) {
      const uiMenuEntity = this.uiMenuEntities[menu];
      const isCurrentMenu = this.isUIVisible() && menu == this.currentMenu;
      uiMenuEntity.setAttribute("visible", isCurrentMenu);
      uiMenuEntity.querySelectorAll("[dynamic-text]").forEach((entity) => {
        if (entity.dataset.notRaycastable == undefined) {
          entity.setAttribute("dynamic-text", "raycastable", isCurrentMenu);
        }
      });
    }
  },

  selectLight: function (_light) {
    console.log(_light);
    this.selectedLight = _light;
    this.currentMenu = "light";
    this.onMenuUpdate();
  },

  onPersistentAnchor: function () {
    this.uiEntity
      .querySelectorAll("[data-requires-anchor]")
      .forEach((entity) => {
        entity.setAttribute("visible", "true");
      });
  },

  onUIClick: function (event) {
    const menu = event.target.closest("[data-ui-menu]").dataset.uiMenu;
    const option =
      event.target.closest("[dynamic-text]").components["dynamic-text"].data
        .text;
    this.onMenuUIClick(menu, option);
  },

  onMenuUIClick: function (menu, option) {
    //console.log(menu, option);
    let currentMenu = this.currentMenu;
    switch (menu) {
      case "main":
        switch (option) {
          case "anchor":
            currentMenu = "anchor";
            break;
          case "lights":
            currentMenu = "lights";
            break;
          case "demos":
            currentMenu = "demos";
            break;
        }
        break;
      case "anchor":
        switch (option) {
          case "back":
            currentMenu = "main";
            break;
          case "set anchor":
            this.hideUI();
            this.showAnchor();
            break;
        }
        break;
      case "lights":
        switch (option) {
          case "back":
            currentMenu = "main";
            break;
          case "<":
            this.lightsPageIndex = Math.max(0, this.lightsPageIndex - 1);
            this.onLightsPageIndexUpdate();
            break;
          case ">":
            this.lightsPageIndex = Math.min(
              this.maxLightsPageIndex,
              this.lightsPageIndex + 1
            );
            this.onLightsPageIndexUpdate();
            break;
        }
        break;
      case "light":
        switch (option) {
          case "back":
            currentMenu = "main";
            break;
        }
        break;
      case "demos":
        switch (option) {
          case "back":
            currentMenu = "main";
            break;
          default:
            console.log("option", option);
            this.data.mode = option;
            this.onModeUpdate();
            //this.hideUI();
            break;
        }
        break;
    }
    if (currentMenu != this.currentMenu) {
      this.currentMenu = currentMenu;
      this.onMenuUpdate();
    }
  },

  showAnchor: function () {
    this.setHintText(`press "B" to set the anchor`);
    window.cameraControls.right.showAnchor();
  },
  hideAnchor: function () {
    this.setHintText("");
    window.cameraControls.right.hideAnchor();
  },

  onEnterVR: function () {
    console.log("enter-vr");
    if (this.sceneEl.is("ar-mode")) {
      this.isInAR = true;
      this.onEnterAR();
    }
  },
  onExitVR: function () {
    console.log("exit-vr");
    if (this.isInAR == true) {
      this.isInAR = false;
      this.onExitAR();
    }
  },

  onEnterAR: function () {
    console.log("enter AR");
    if (!this.isUIVisible() && !this.didOpenUIAtLeastOnce) {
      this.setHintText(`Press "A" to toggle the Menu`);
    }
  },
  onExitAR: function () {
    console.log("exit AR");
    this.setHintText("");
  },

  setHintText: function (text) {
    this.hintTextEntity.setAttribute("dynamic-text", "text", text);
  },

  setupSocketConnection: function () {
    let socket;

    const createSocket = () => {
      socket = window.socket = io();

      socket.on("connect", () => {
        console.log("connection opened");
        this.onSocketConnection();
      });
      socket.on("disconnect", () => {
        console.log("connection closed");
        this.onSocketDisconnection();
      });
      socket.on("bridges", (bridges) => {
        console.log("bridges", bridges);
        this.onBridges(bridges);
      });
    };
    createSocket();

    const send = (type, ...args) => {
      if (socket.connected) {
        socket.emit(type, ...args);
      }
    };

    this.sendSocketMessage = send;
  },

  onSocketConnection: function () {},
  onSocketDisconnection: function () {},
  onBridges: function (bridges) {
    this.entities.forEach((entity) => entity.remove());
    this.entities.length = 0;

    this.bridges = bridges;
    this.lights = [];
    this.bridges.forEach((bridge, bridgeIndex) => {
      const { group, lights } = bridge;
      for (const lightId in group.lights) {
        const { name, position } = lights[lightId];
        const lightEntity = document.createElement("a-entity");
        lightEntity.setAttribute(
          "philips-hue",
          `bridge: ${bridgeIndex}; light: ${lightId}; name: ${name}`
        );
        if (position) {
          lightEntity.setAttribute("position", position.join(" "));
        }

        this.sceneContainer.appendChild(lightEntity);
        this.entities.push(lightEntity);
        this.lights.push({ bridgeIndex, lightId, name });
      }
    });

    this.lightsPageIndex = 0;
    this.maxLightsPageIndex = Math.ceil(this.lights.length / 5) - 1;
    this.onLightsPageIndexUpdate();
  },
  onLightsPageIndexUpdate: function () {
    let shouldShowPreviousLightsEntity = false;
    let shouldShowLightsPageEntity = false;
    let shouldShowNextLightsEntity = false;

    if (this.maxLightsPageIndex > 0) {
      shouldShowLightsPageEntity = true;
    }

    if (shouldShowLightsPageEntity) {
      if (this.lightsPageIndex > 0) {
        shouldShowPreviousLightsEntity = true;
      }
      if (this.lightsPageIndex < this.maxLightsPageIndex) {
        shouldShowNextLightsEntity = true;
      }
    }

    this.previousLightsEntity.setAttribute(
      "visible",
      shouldShowPreviousLightsEntity
    );
    this.lightsPageIndexEntity.setAttribute(
      "visible",
      shouldShowLightsPageEntity
    );
    this.nextLightsEntity.setAttribute("visible", shouldShowNextLightsEntity);

    if (shouldShowLightsPageEntity) {
      this.lightsPageIndexEntity.setAttribute(
        "dynamic-text",
        "text",
        `${this.lightsPageIndex}/${this.maxLightsPageIndex}`
      );
    }

    let baseLightIndex = this.lightsPageIndex * 5;
    this.lightsPageEntities.forEach((entity, index) => {
      const lightIndex = baseLightIndex + index;
      const light = this.lights[lightIndex];
      entity._light = light;
      entity.setAttribute("visible", Boolean(light));
      if (light) {
        entity.setAttribute("dynamic-text", "text", light.name);
      }
      entity.setAttribute("dynamic-text", "raycastable", Boolean(light));
    });
  },

  onModeUpdate: function () {
    console.log(`new mode: "${this.data.mode}"`);

    let shouldShowFlashlight = false;
    let shouldShowTorch = false;
    let shouldShowMode = true;
    switch (this.data.mode) {
      case "flashlight":
        shouldShowFlashlight = true;
        break;
      case "torch":
        shouldShowTorch = true;
        break;
      case "none":
        shouldShowMode = false;
        break;
      default:
        break;
    }
    if (shouldShowMode) {
      this.setHintText(`mode: ${this.data.mode}`);
    } else {
      this.setHintText("");
    }
    this.flashlight.setAttribute("visible", shouldShowFlashlight);
    this.torch.setAttribute("visible", shouldShowTorch);
  },

  onAButtonDown: function () {
    console.log("A");
    this.toggleUI();
  },
  onBButtonDown: function () {
    console.log("B");
    if (window.cameraControls.right.isAnchorVisible) {
      window.cameraControls.right.createAnchor();
      this.hideAnchor();
      this.showUI();
    }
  },
  onLeftTriggerDown: function () {
    console.log("left trigger down");
  },
  onXButtonDown: function () {
    console.log("X");
  },
  onYButtonDown: function () {
    console.log("Y");
  },
  onRightTriggerDown: function () {
    console.log("right trigger down");
  },

  update: function (oldData) {
    const diff = AFRAME.utils.diff(oldData, this.data);

    const diffKeys = Object.keys(diff);

    if (diffKeys.includes("mode")) {
      this.onModeUpdate();
    }
  },

  onGripChanged: function (event) {
    if (this.data.mode == "flashlight") {
      const { value } = event.detail;
      this.flashlightIntensity = value;
    }
  },

  addEntity: function (entity) {
    this.entities.push(entity);
  },
  removeEntity: function (entity) {
    this.entities.splice(this.entities.indexOf(entity), 1);
  },

  tick: function (time, timeDelta) {
    if (
      time > 0 &&
      window.socket?.readyState == WebSocket.OPEN &&
      window.sendMessage
    ) {
      const lights = [];
      const { position, vector, cameraForwardPosition } = this;
      switch (this.data.mode) {
        case "glow":
        case "gaze":
          this.cameraForward.object3D.getWorldPosition(cameraForwardPosition);
          this.cameraForwardPosition.subVectors(
            this.cameraForwardPosition,
            this.camera.object3D.position
          );
          break;
        case "flashlight":
          this.controllers.right.object3D.getWorldPosition(
            this.flashlightPosition
          );
          this.flashlightForward.object3D.getWorldPosition(
            this.flashlightForwardPosition
          );
          this.flashlightForwardPosition.subVectors(
            this.flashlightForwardPosition,
            this.flashlightPosition
          );
          break;
        case "torch":
          this.torchFlame.object3D.getWorldPosition(this.torchFlamePosition);
          break;
      }

      this.entities.forEach((entity, index) => {
        const { philipsHue } = entity;
        entity.object3D.getWorldPosition(position);

        if (philipsHue && philipsHue.light.hasLoaded) {
          const { bridge: bridgeIndex, light: lightIndex } = philipsHue.data;
          let { intensity } = philipsHue;
          const newColor = philipsHue._color;
          switch (this.data.mode) {
            case "none":
              break;
            case "scene":
              const { color: _color, intensity: _intensity } =
                philipsHue.light.components.light.light;
              newColor.copy(_color);
              intensity = THREE.MathUtils.clamp(
                _intensity / this.data.intensityScalar,
                0,
                1
              );
              break;
            case "glow":
              {
                vector.subVectors(position, this.camera.object3D.position);
                vector.y = 0;
                const distance = vector.length();
                const clampedDistance = this.clampValue(
                  distance,
                  [0.1, 1.5],
                  2
                );
                newColor.setHSL(0, 0, 1);
                intensity = 1 - clampedDistance;
                if (false && index == 0) {
                  console.log(
                    `distance: ${clampedDistance}, intensity: ${intensity}`
                  );
                }
              }
              break;
            case "gaze":
              {
                vector.subVectors(position, this.camera.object3D.position);
                const distance = vector.length();
                const angle = cameraForwardPosition.angleTo(vector);

                const clampedDistance = this.clampValue(
                  distance,
                  this.data.gazeDistanceThreshold
                );
                const clampedAngle = this.clampValue(
                  angle,
                  this.data.angleThreshold
                );
                newColor.setHSL(0, 0, 1);
                intensity = (1 - clampedDistance) * (1 - clampedAngle);
                if (false && index == 2) {
                  console.log(
                    `distance: ${clampedDistance}, angle: ${clampedAngle}, intensity: ${intensity}`
                  );
                }
              }
              break;
            case "torch":
              {
                vector.subVectors(position, this.torchFlamePosition);
                vector.y = 0;
                const distance = vector.length();

                const clampedDistance = this.clampValue(
                  distance,
                  this.data.torchDistanceThreshold,
                  1
                );
                intensity = 1 - clampedDistance;
                if (intensity > 0) {
                  intensity += ((Math.random() - 0.5) / 5) * intensity;
                }
                newColor.setHSL(
                  THREE.MathUtils.lerp(...this.data.torchHueRange, intensity),
                  0.7,
                  0.7
                );
                // FILL - add intensity flicker
                // FILL - change color based on distance
                if (false && index == 2) {
                  console.log(
                    `distance: ${clampedDistance}, intensity: ${intensity}`
                  );
                }
              }
              break;
            case "flashlight":
              {
                vector.subVectors(position, this.flashlightPosition);
                const distance = vector.length();
                const angle = this.flashlightForwardPosition.angleTo(vector);

                const clampedDistance = this.clampValue(
                  distance,
                  this.data.flashlightDistanceThreshold
                );
                const clampedAngle = this.clampValue(
                  angle,
                  this.data.flashlightAngleThreshold,
                  3
                );
                newColor.setHSL(0, 0, 1);
                intensity =
                  this.flashlightIntensity *
                  (1 - clampedDistance) *
                  (1 - clampedAngle);
                if (false && index == 2) {
                  console.log(
                    `angle: ${angle}, distance: ${clampedDistance}, angle: ${clampedAngle}, intensity: ${intensity}`
                  );
                }
              }
              break;
            case "virtual":
              // FILL
              // get distance from virtual lights
              // set intensity/color based on [data-virtual-intensity] and [data-virtual-color]
              // also take boundary mesh into consideration (so scaling affects light)
              break;
            default:
              console.warn(`uncaught mode "${this.data.mode}"`);
              break;
          }

          const newPhilipsHueColor = philipsHue.threeLightToPhilipsHueColor(
            newColor,
            intensity
          );

          let colorDifference = 0;

          if (philipsHue.philipsHueColor) {
            philipsHue.philipsHueColor.forEach((value, index) => {
              colorDifference += Math.abs(value - newPhilipsHueColor[index]);
            });
          }
          if (
            !philipsHue.philipsHueColor ||
            colorDifference > this.data.colorDifferenceThreshold
          ) {
            if (false)
              console.log(
                philipsHue.philipsHueColor,
                newPhilipsHueColor,
                colorDifference
              );
            philipsHue.philipsHueColor = newPhilipsHueColor;
            philipsHue.color.copy(newColor);
            philipsHue.intensity = intensity;
            if (this.data.mode != "scene") {
              philipsHue.updateLight();
            }
            console.log(`new color for "${entity.id}"`, newPhilipsHueColor);
            lights.push({
              color: newPhilipsHueColor,
              bridge: bridgeIndex,
              light: lightIndex,
            });
          }
        }
      });
      if (lights.length > 0) {
        this.sendSocketMessage("setLights", { lights });
      }
    }
  },

  clampValue: function (value, threshold, exp = 3) {
    const [min, max] = threshold;
    value = THREE.MathUtils.clamp(value, min, max);
    value -= min;
    value /= max - min;
    return value ** exp;
  },

  isUIVisible: function () {
    return this.uiEntity.object3D.visible;
  },
  toggleUI: function () {
    if (this.isUIVisible()) {
      this.hideUI();
    } else {
      this.showUI();
    }
  },
  showUI: function () {
    this.didOpenUIAtLeastOnce = true;
    this.setHintText("");

    const { uiEntity, uiPosition, camera } = this;

    this.cameraForward.object3D.getWorldPosition(uiPosition);
    //uiPosition.y = 0;
    if (this.isOculusBrowser) {
      uiPosition.y -= 0.1;
    }
    uiEntity.object3D.position.copy(uiPosition);

    if (this.isOculusBrowser) {
      uiEntity.object3D.lookAt(camera.object3D.position);
    } else {
      uiEntity.object3D.rotation.y = camera.object3D.rotation.y;
    }

    uiEntity.object3D.visible = true;
    this.onMenuUpdate();
    this.hideAnchor();
  },
  hideUI: function () {
    this.uiEntity.object3D.visible = false;
    this.onMenuUpdate();
  },
});

AFRAME.registerComponent("philips-hue", {
  schema: {
    bridge: { type: "number" },
    light: { type: "number" },
    name: { type: "string" },
  },
  threeLightToPhilipsHueColor: function (color, intensity) {
    color = color
      .toArray()
      .map((value) =>
        THREE.MathUtils.clamp(Math.round(intensity * value * 255), 0, 255)
      );
    return color;
  },
  init: async function () {
    //this.system.addEntity(this.el);
    this.color = new THREE.Color();
    this._color = new THREE.Color();
    this.previousColor = new THREE.Color();
    this.intensity = 0;
    this.philipsHueColor = null;
    this.light = document.createElement("a-light");
    this.light.setAttribute("type", "point");
    this.shouldAnimateLight = false;
    if (this.shouldAnimateLight) {
      this.light.setAttribute(
        "animation__intensity",
        `property: light.intensity; to: ${
          this.intensity * this.system.data.intensityScalar
        }; dur: 20; easing: linear;`
      );
      this.light.setAttribute(
        "animation__color",
        `property: light.color; to: #${this.color.getHexString()}; dur: 20; easing: linear;`
      );
    }

    this.sphere = document.createElement("a-sphere");
    this.sphere.setAttribute("color", "red");
    this.sphere.setAttribute("material", "shader: flat; color: red");
    this.sphere.setAttribute("radius", "0.05");
    this.sphere.setAttribute(
      "visible",
      this.system.data.debug ? "true" : "false"
    );
    this.el.appendChild(this.sphere);

    this.el.appendChild(this.light);
    this.el.philipsHue = this;

    this.light.addEventListener("loaded", () => {
      this.updateLight();
    });
  },

  updateLight: function () {
    const intensity = this.intensity * this.system.data.intensityScalar;
    if (this.shouldAnimateLight) {
      this.light.setAttribute("animation__intensity", `to: ${intensity};`);
      this.light.setAttribute(
        "animation__color",
        `to: #${this.color.getHexString()};`
      );
    } else {
      const light = this.light.components.light.light;
      light.intensity = intensity;
      light.color.copy(this.color);
    }
  },
  remove: function () {
    //this.system.removeEntity(this);
  },
});
