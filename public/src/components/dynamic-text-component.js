AFRAME.registerComponent("dynamic-text", {
  schema: {
    text: { type: "string", default: "" },
    wordWrap: { type: "number", default: 20 },
    width: { type: "number", default: 0.5 },
    opacity: { type: "number", default: 1 },
    backgroundOpacity: { type: "number", default: 1 },
    color: { type: "color", default: "black" },
    backgroundColor: { type: "color", default: "white" },
    align: {
      type: "string",
      default: "center",
      oneOf: ["left", "center", "right"],
    },
    raycastable: { type: "boolean", default: false },
    scale: { type: "number", default: 1 },
  },

  init: function () {
    this.textSize = new THREE.Vector3();

    this.updateScale();

    this.textEntity = document.createElement("a-text");
    this.textEntity.setAttribute("word-wrap", this.data.wordWrap);
    this.textEntity.setAttribute("color", this.data.color);
    this.textEntity.setAttribute("shader", "flat");
    this.textEntity.setAttribute("align", this.data.align);
    this.textEntity.setAttribute("width", this.data.width);
    this.textEntity.setAttribute("value", this.data.text);
    this.textEntity.setAttribute("position", "0 0 0.0001");
    this.el.appendChild(this.textEntity);

    this.planeEntity = document.createElement("a-plane");
    this.planeEntity.setAttribute(
      "geometry",
      "primitive: plane; width: 0; height: 0;"
    );
    this.planeEntity.setAttribute(
      "material",
      `color: ${this.data.backgroundColor}; shader: flat; opacity: 1`
    );
    this.el.appendChild(this.planeEntity);

    //this.updateRaycastable();
    this.planeEntity.addEventListener("mouseenter", () => {
      this.el.setAttribute("dynamic-text", "backgroundColor", "lightgreen");
    });
    this.planeEntity.addEventListener("mouseleave", () => {
      this.el.setAttribute("dynamic-text", "backgroundColor", "white");
    });
    this.planeEntity.addEventListener("mousedown", () => {
      //console.log("click");
    });
  },

  update: function (oldData) {
    const diff = AFRAME.utils.diff(oldData, this.data);

    const diffKeys = Object.keys(diff);

    diffKeys.forEach((key) => {
      switch (key) {
        case "text":
          this.updateText();
          break;
        case "align":
          break;
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
        case "wordWrap":
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

  updateText: function () {
    this.textEntity.setAttribute("value", this.data.text);
    this.updateTextSize();
  },
  updateTextSize: function () {
    const { hasLoaded } = this.el;
    if (this.el.hasLoaded) {
      const { textSize, planeEntity, textEntity } = this;
      let text = textEntity.components["text"];

      if (!text?.initialized || !text.geometry) {
        setTimeout(() => {
          this.updateTextSize();
        }, 10);
        return;
      } else {
        setTimeout(() => {
          try {
            text.geometry.computeBoundingBox();
            const { boundingBox } = text.geometry;
            boundingBox.getSize(textSize);

            const width = textSize.x / 1500;
            const height = textSize.y / 1500;
            planeEntity.setAttribute("width", width);
            planeEntity.setAttribute("height", height);
            if (text.data.baseline !== "center") {
              planeEntity.object3D.position.y =
                ((text.data.baseline == "top" ? -1 : 1) * height) / 2;
            }
          } catch (error) {
            setTimeout(() => {
              this.updateTextSize();
            }, 10);
          }
        }, 0);
      }
    } else {
      this.el.addEventListener("loaded", () => {
        this.updateTextSize();
      });
    }
  },
  updateColor: function () {
    this.textEntity.setAttribute("color", this.data.color);
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

  updateScale: function () {
    this.el.setAttribute(
      "scale",
      `${this.data.scale} ${this.data.scale} ${this.data.scale}`
    );
  },
});
