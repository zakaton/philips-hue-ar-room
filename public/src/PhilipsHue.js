class PhilipsHue {
  constructor(ip, username, index = 1) {
    this._ip = ip;
    this._username = username;
    this._index = index;
    this._updateUrl();
  }

  _ip = "";
  get ip() {
    return this._ip;
  }
  set ip(ip) {
    this._ip = ip;
    this._updateUrl();
  }

  _username = "";
  get username() {
    return this._username;
  }
  set username(username) {
    this._username = username;
    this._updateUrl();
  }

  _index = 1;
  get index() {
    return this._index;
  }
  set index(index) {
    this._index = index;
    this._updateUrl();
  }

  _updateUrl() {
    this.url = `${ip}/api/${username}`;
  }

  async getInformation() {
    const response = await fetch(`${this.url}/lights/${this.index}`);
    const json = await response.json();
    return json;
  }
  async getState() {
    const information = await this.getInformation();
    return information.state;
  }
  async setState(newState) {
    const response = await fetch(`${this.url}/lights/${this.index}/state`, {
      method: "PUT",
      body: JSON.stringify(newState),
    });
    const json = await response.json();
    return json;
  }
  async setEnabled(enabled) {
    return this.setState({ on: enabled });
  }
  async setBrightness(brightness) {
    brightness *= 254;
    brightness = Math.floor(brightness);
    return this.setState({ bri: brightness });
  }
  async setSaturation(saturation) {
    saturation *= 254;
    saturation = Math.floor(saturation);
    return this.setState({ sat: saturation });
  }
  async setTemperature(temperature) {
    temperature *= 254;
    temperature = Math.floor(temperature);
    return this.setState({ ct: temperature });
  }
  async setHue(hue) {
    hue *= 65535;
    hue = Math.floor(hue);
    return this.setState({ hue });
  }
  async setColorRGB(r, g, b) {
    const { x, y } = this.rgbToXY(r, g, b);
    return this.setState({ xy: [x, y] });
  }
  async setColorHex(hex) {
    if (hex.startsWith("#")) {
      hex = hex.substring(1);
    }
    const { r, g, b } = this.hexToRGB(hex);
    return this.setColorRGB(r, g, b);
  }
  hexToRGB(hex) {
    var bigint = parseInt(hex, 16);
    var r = (bigint >> 16) & 255;
    var g = (bigint >> 8) & 255;
    var b = bigint & 255;

    return { r, g, b };
  }
  rgbToXY(red, green, blue) {
    let redC = red / 255;
    let greenC = green / 255;
    let blueC = blue / 255;
    //console.log(redC, greenC, blueC);

    let redN =
      redC > 0.04045
        ? Math.pow((redC + 0.055) / (1.0 + 0.055), 2.4)
        : redC / 12.92;
    let greenN =
      greenC > 0.04045
        ? Math.pow((greenC + 0.055) / (1.0 + 0.055), 2.4)
        : greenC / 12.92;
    let blueN =
      blueC > 0.04045
        ? Math.pow((blueC + 0.055) / (1.0 + 0.055), 2.4)
        : blueC / 12.92;
    //console.log(redN, greenN, blueN);

    let X = redN * 0.664511 + greenN * 0.154324 + blueN * 0.162028;

    let Y = redN * 0.283881 + greenN * 0.668433 + blueN * 0.047685;

    let Z = redN * 0.000088 + greenN * 0.07231 + blueN * 0.986039;

    //console.log(X, Y, Z);

    let x = X / (X + Y + Z) || 0;

    let y = Y / (X + Y + Z) || 0;

    //console.log(x, y);

    //X = x * 65536;
    //Y = y * 65536;
    return { x, y };
  }
}
