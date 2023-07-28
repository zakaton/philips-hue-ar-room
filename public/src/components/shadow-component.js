// https://glitch.com/edit/#!/shadow-material
AFRAME.registerComponent("shadow-material", {
  init: function () {
    console.log("shadow-material");
    let el = this.el;
    let self = this;
    let mesh = el.getObject3D("mesh");
    console.log(mesh);
    if (!mesh) {
      return;
    }
    mesh.material = new THREE.ShadowMaterial();
    mesh.material.opacity = 1.0;
  },
});
