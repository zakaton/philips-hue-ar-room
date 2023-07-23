/* global AFRAME, THREE */

// https://github.com/immersive-web/webxr-samples/blob/main/proposals/plane-detection.html
AFRAME.registerSystem("detected-planes", {
  schema: {
    verticalColor: { type: "color", default: "red" },
    horizontalColor: { type: "color", default: "blue" },
  },
  init: function () {
    window.detectedPlanesSystem = this;
  },
  tick: function () {
    var renderer = this.el.sceneEl.renderer;
    if (renderer && !this.referenceSpace) {
      this.referenceSpace = renderer.xr.getReferenceSpace();
    }

    this.frame = this.el.sceneEl.frame;
    if (this.frame && this.referenceSpace) {
      const { detectedPlanes } = this.frame;
      if (!this.detectedPlanes && detectedPlanes.size > 0) {
        this.detectedPlanes = detectedPlanes;
        console.log("detectedPlanes", detectedPlanes);
        this.setupPlanes();
      }
    }
  },
  setupPlanes: function () {
    const box = new THREE.Box2();
    const center = new THREE.Vector2();
    const size = new THREE.Vector2();

    const correctionEuler = new THREE.Euler();
    correctionEuler.x = Math.PI / 2;
    const correctionQuaternion = new THREE.Quaternion();
    correctionQuaternion.setFromEuler(correctionEuler);

    this.detectedPlaneEntities?.forEach((entity) => {
      entity.remove();
    });
    this.detectedPlaneEntities = [];

    this.detectedPlanes.forEach((plane) => {
      const planePose = this.frame.getPose(
        plane.planeSpace,
        this.referenceSpace
      );

      const { orientation, polygon, semanticLabel } = plane;
      if (orientation == "horizontal" || orientation == "vertical") {
        box.makeEmpty();
        polygon.forEach((vertex) => {
          box.expandByPoint({ x: vertex.x, y: vertex.z });
        });
        box.getCenter(center);
        box.getSize(size);

        const planeEntity = document.createElement("a-plane");
        planeEntity.setAttribute("width", size.x);
        planeEntity.setAttribute("height", size.y);
        planeEntity.setAttribute(
          "color",
          orientation == "horizontal"
            ? this.data.horizontalColor
            : this.data.verticalColor
        );
        planeEntity.setAttribute("material", "side: double; opacity: 0.3;");
        planeEntity.object3D.position.copy(planePose.transform.position);
        planeEntity.object3D.quaternion.copy(planePose.transform.orientation);
        planeEntity.object3D.quaternion.multiply(correctionQuaternion);
        planeEntity.dataset.detectedPlane = "";
        planeEntity.setAttribute("visible", "false");
        planeEntity.classList.add("allow-ray");
        this.sceneEl.appendChild(planeEntity);
        this.detectedPlaneEntities.push(planeEntity);
      }
    });
  },
});
