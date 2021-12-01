
const express = require('express')
const app = express()
const port = 3000
const path = require('path')
const fs = require('fs')
const iframe = fs.readFileSync(__dirname + "/iframe.html").toString();
const sessions = []


X_SIZE = 20;
Y_SIZE = 10;
PLAYFIELD_EMPTY_CHAR = '.';
SNAKE_TRAIL_CHAR = 'o';
SNAKE_HEAD_CHAR = 'O';
APPLE_CHAR = 'X';

class SnakeInstance {
    constructor(ip) {
        if (!ip || ip == "") throw "Provide an ip";

        this.ip = ip;
        this.direction = "UP";
        this.snakeTrail = [];
        this.snakeSize = 3;
        this.headX = Math.floor(X_SIZE / 2);
        this.headY = Math.floor(Y_SIZE / 2);
        this.appleX = Math.floor(Math.random() * X_SIZE);
        this.appleY = Math.floor(Math.random() * Y_SIZE);
        this.alive = true;
        this.lastUpdate = 0;
        this.lastDirectionUpdate = 0;
        this.directionUpdateInterval = 0;
    }

    directionUpdate(d) {
        if (d == this.direction && Date.now() - this.lastUpdate < 1000) return;
        this.directionUpdateInterval = Date.now() - this.lastDirectionUpdate;
        this.lastDirectionUpdate = Date.now();
        this.direction = d;
        this.update()

    }

    update() {
        if (!(Date.now() - this.lastUpdate >= 1000) && !(this.directionUpdateInterval >= 1000)) return;
        this.lastUpdate = Date.now()
        switch (this.direction) {
            case "DOWN": this.headY++; break;
            case "UP": this.headY--; break;
            case "RIGHT": this.headX++; break;
            case "LEFT": this.headX--; break;
        }

        if (this.headX < 0) this.headX = X_SIZE - 1;
        if (this.headX > X_SIZE - 1) this.headX = 0;
        if (this.headY < 0) this.headY = Y_SIZE - 1;
        if (this.headY > Y_SIZE - 1) this.headY = 0;

        for (let i = 0; i < this.snakeTrail.length; i++) {
            if (this.snakeTrail[i].x == this.headX && this.snakeTrail[i].y == this.headY) {
                return this.alive = false;
            }
        }
        this.snakeTrail.push({ x: this.headX, y: this.headY });
        while (this.snakeTrail.length >= this.snakeSize) {
            this.snakeTrail.shift();
        }

        if (this.headX == this.appleX && this.headY == this.appleY) {
            this.snakeSize++;
            this.appleX = Math.floor(Math.random() * X_SIZE);
            this.appleY = Math.floor(Math.random() * Y_SIZE);
        }
    }

    toArray() {
        let out = Array.from(Array(Y_SIZE), _ => Array(X_SIZE).fill(PLAYFIELD_EMPTY_CHAR));
        for (let trail of this.snakeTrail) {
            out[trail.y][trail.x] = SNAKE_TRAIL_CHAR;
        }
        out[this.headY][this.headX] = SNAKE_HEAD_CHAR;
        out[this.appleY][this.appleX] = APPLE_CHAR;
        return out;
    }
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/index.html")
})

app.get('/iframe.html*', (req, res) => {
    console.log(req.url)
    let data;
    let snake;
    if (req.url.replace("/iframe.html", "") == "?restart=1") {
        delete sessions[req.ip]
    }

    if ((req.url == "/iframe.html" || req.url == "/iframe.html?restart=1") && !sessions[req.ip]) {
        console.log("SETUP")
        // game setup
        sessions[req.ip] = new SnakeInstance(req.ip)
        snake = sessions[req.ip]
        snake.update();
    }
    if ((req.url == "/iframe.html" || req.url == "/iframe.html?") && sessions[req.ip]) {
        snake = sessions[req.ip]
        snake.update();
    }
    if (req.url.includes("?go=") && sessions[req.ip]) {
        snake = sessions[req.ip]
        snake.directionUpdate(req.url.replace("/iframe.html?go=", "").toUpperCase())

    }
    if (!snake.alive) {
        data = iframe.replace("$REPLACE", `YOU LOST! <a href="/iframe.html?restart=1">Restart</a>`)
    } else {
        data = iframe.replace("$REPLACE", snake.toArray().map(e => e.join('')).join('<br>') + `<br><br>Score: ${snake.snakeSize - 3}`)
        res.set("Refresh", "1; /iframe.html")
    }

    res.set("Content-Type", "text/html")
    res.send(data)
})

app.set('trust proxy', true)

app.listen(port, () => {
    console.log(`Started.`)
})
