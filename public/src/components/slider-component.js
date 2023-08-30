AFRAME.registerComponent("slider", {
  schema: {
    opacity: { type: "number", default: 1 },
    backgroundOpacity: { type: "number", default: 1 },
    color: { type: "color", default: "black" },
    backgroundColor: { type: "color", default: "white" },
    raycastable: { type: "boolean", default: true },
    width: { type: "number", default: 0.5 },
    height: { type: "number", default: 0.04 },
    radiusInner: { type: "number", default: 0.012 },
    radiusOuter: { type: "number", default: 0.02 },
  },

  init: function () {
    this.isOculusBrowser = AFRAME.utils.device.isOculusBrowser();

    this.ringEntity = document.createElement("a-ring");
    this.ringEntity.setAttribute("color", this.data.color);
    this.ringEntity.setAttribute("shader", "flat");
    this.ringEntity.setAttribute("radius-inner", this.data.radiusInner);
    this.ringEntity.setAttribute("radius-outer", this.data.radiusOuter);
    this.ringEntity.setAttribute("position", "0 0 0.0001");
    this.el.appendChild(this.ringEntity);

    this.planeEntity = document.createElement("a-plane");
    this.planeEntity.setAttribute(
      "material",
      `color: ${this.data.backgroundColor}; shader: flat; opacity: 1`
    );
    this.updateWidth();
    this.updateHeight();
    this.el.appendChild(this.planeEntity);

    //this.updateRaycastable();
    this.planeEntity.addEventListener("mouseenter", () => {
      this.el.setAttribute("slider", "backgroundColor", "lightgreen");
    });
    this.planeEntity.addEventListener("mouseleave", () => {
      this.el.setAttribute("slider", "backgroundColor", "white");
    });
    this.planeEntity.addEventListener("mousedown", () => {
      console.log("mousedown");
      this.isMouseDown = true;
    });
    this.planeEntity.addEventListener("mouseup", () => {
      console.log("mouseup");
      this.isMouseDown = false;
    });

    this.planeEntity.addEventListener(
      "raycaster-intersected",
      this.onRaycasterIntersected.bind(this)
    );
    this.planeEntity.addEventListener(
      "raycaster-intersected-cleared",
      this.onRaycasterIntersectedCleared.bind(this)
    );

    this.value = new THREE.Vector2();
  },

  onRaycasterIntersected: function (event) {
    this.raycaster = event.detail.el;
  },
  onRaycasterIntersectedCleared: function () {
    this.raycaster = null;
  },
  tick: function () {
    if (this.isOculusBrowser && !this.isMouseDown) {
      return;
    }
    if (!this.raycaster) {
      return;
    }

    let intersection = this.raycaster.components.raycaster.getIntersection(
      this.planeEntity
    );
    if (!intersection) {
      return;
    }

    this.value.copy(intersection.uv);
    this.updateSlider();
  },

  updateRing: function () {
    let x = this.value.x - 0.5;
    x *= this.data.width;
    this.ringEntity.object3D.position.x = x;
  },

  updateSlider: function () {
    this.updateRing();
    this.el.emit("sliderValue", { value: this.value.x });
  },

  setValue: function (value) {
    this.value.x = value;
    this.updateRing();
  },

  update: function (oldData) {
    const diff = AFRAME.utils.diff(oldData, this.data);

    const diffKeys = Object.keys(diff);

    diffKeys.forEach((key) => {
      switch (key) {
        case "color":
          this.updateColor();
          break;
        case "backgroundColor":
          this.updateBackgroundColor();
          break;
        case "opacity":
          break;
        case "backgroundOpacity":
          this.updateBackgroundOpacity();
          break;
        case "width":
          break;
        case "scale":
          this.updateScale();
          break;
        case "raycastable":
          this.updateRaycastable();
          break;
        default:
          console.log("uncaught key", key);
      }
    });
  },

  updateColor: function () {
    this.ringEntity.setAttribute("color", this.data.color);
  },
  updateBackgroundColor: function () {
    this.planeEntity.setAttribute(
      "material",
      "color",
      this.data.backgroundColor
    );
  },
  updateBackgroundOpacity: function () {
    this.planeEntity.setAttribute(
      "material",
      "opacity",
      this.data.backgroundOpacity
    );
  },

  updateRaycastable: function () {
    if (this.data.raycastable) {
      this.planeEntity.classList.add("raycastable");
    } else {
      this.planeEntity.classList.remove("raycastable");
    }
  },

  updateWidth: function () {
    this.planeEntity.setAttribute("width", this.data.width);
  },
  updateHeight: function () {
    this.planeEntity.setAttribute("height", this.data.height);
  },
});
