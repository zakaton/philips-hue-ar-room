# philips-hue-ar-room

On macOS:
for the security stuff, run the command in the terminal:
`sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ./sec/key.pem -out ./sec/cert.pem`
Windows is the same but without `sudo`, if you have openssl installed

put the \*.pem files in the /sec/ folder

turn firewall off

install https://code.visualstudio.com/ & https://nodejs.org/en/
install npm in terminal: sudo npm install
install yarn in VS Code terminal: yarn install
start localhost: yarn start
open https://localhost/ in chrome
