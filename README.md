# philips-hue-ar-room

On macOS:
for the security stuff, run the command in the terminal:
`sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ./key.pem -out cert.pem`
Windows is the same but without `sudo`, if you have openssl installed

put the \*.pem files in the /sec/ folder

also comment out lines 32 and 44 of hue-bridge.js under /node_modules/phea/build/hue-bridge.js for group id's outside the range

also rewrite line 58 of phea-engine.js to:

```
const light = this.lights.find(({id}) => id == lightId)
                light.transitionColor(rgb, tweenTime);
```

turn firewall off

install https://code.visualstudio.com/ & https://nodejs.org/en/
install npm in terminal: sudo npm install
install yarn in VS Code terminal: yarn install
start localhost: yarn start
open https://localhost/ in chrome
