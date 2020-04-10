import {GameMap, Sprite} from "../src/gamemap.mjs"
import {Enemy} from "../src/enemies.mjs"
import {Base} from "../src/base.mjs"
import {Tower} from "../src/towers.mjs"
import {HPBar} from "../src/hpbar.mjs"
import {VMath} from "../src/vmath.mjs"

const spriteList = [
    "../assets/enemy/0.png",
    "../assets/enemy/1.png",
    "../assets/enemy/2.png",
    "../assets/base/0.png",
    "../assets/base/1.png",
    "../assets/base/2.png",
    "../assets/foxTower.png",
];

class BasicEnemy extends Enemy {
    spriteFrames = [new Sprite(0), new Sprite(1), new Sprite(2)]   // spritelist idxs
    ticksPerSpriteTransition = 5 // number of ticks for each frame in the list above

    hp = 0
    velocity = 0.05 // horzt/vert velocity in blocks per tick
    attacksTowers = false
    range = 0 // radius of range for tower attacks in blocks
    strength = 1

    spawnOnDeath = [] // enemies to spawn on death
    resistances = [] // Resistances to attack types
}

class BasicBase extends Base {
    spriteFrames = [new Sprite(3), new Sprite(4), new Sprite(5)]
    ticksPerSpriteTransition = 5
    hp = 100

    constructor(spawnID) {
        super(spawnID);
        this.hpbar = new HPBar(this.hp, 64, 4);
    }

    ondamage(atk) {
        super.ondamage(atk);
        this.hpbar.update(this.hp);
        this.spriteFrames.map(frame => {
            const death = 1 - this.hp / this.hpbar.totalHP;
            if (death != 1)
                this.ticksPerSpriteTransition = 5 + 20 * death;
            else
                this.ticksPerSpriteTransition = 0;
            frame.filter = `grayscale(${death})`;
        });
    }

    onrender(ctx) {
        // TODO don't hard code this?
        ctx.translate(-this.position[0], -(this.position[1] + 1));
        this.hpbar.render(ctx);
        ctx.translate(this.position[0], this.position[1] + 1);
    }


}

class FoxTower extends Tower {
    spriteFrames = {
        idle: {
            frames: [new Sprite(6)],
            tpt: 0, // tpt == ticksPerSpriteTransition
        },
    }

    hp = 1
    range = 4
    rotationSpeed = 0.1 // in radians per tick
    priority = "first"

    constructor(spawnID) {
        super(spawnID);
        this.rotation = 0;
    }

    ontick(movementCallback, queryEnemiesCB) {
        return super.ontick((collidesWithWalls, _, sprite) => {
            // this._rotationCounter += 1;
            // this._rotationCounter %= 360;
            // const angle = 2 * Math.PI * this._rotationCounter / 360;
            // const velocity = [-Math.sin(angle), -Math.cos(angle)];

            const queryRes = queryEnemiesCB(this.range, true);

            const enemies = queryRes.enemies;
            const selfCoords = queryRes.selfCoords;

            // rotate towards first enemy. What we really need is to sort this
            // by distance from base along the path...

            if (enemies.length && this.rotationSpeed) {
                if (this.priority == "first")
                    enemies.sort((e1, e2) => e1.distanceToBase > e2.distanceToBase);
                else if (this.priority == "last")
                    enemies.sort((e1, e2) => e1.distanceToBase < e2.distanceToBase);

                const enemyDescription = enemies[0];
                const rotationVector = VMath.mul([1, -1], VMath.sub(selfCoords, enemyDescription.coords));
                const theta = Math.atan2(...rotationVector);

                let minAngle = theta - this.rotation;
                let tmp = theta - ((2 * Math.PI) + this.rotation)
                if (Math.abs(tmp) < Math.abs(minAngle))
                    minAngle = tmp;
                tmp = ((2 * Math.PI) + theta) - this.rotation;
                if (Math.abs(tmp) < Math.abs(minAngle))
                    minAngle = tmp;

                if (Math.abs(minAngle) > this.rotationSpeed)
                    minAngle = Math.sign(minAngle) * this.rotationSpeed;

                this.rotation += minAngle;
            }

            let velocity = [Math.sin(this.rotation), -Math.cos(this.rotation)];
            return movementCallback(collidesWithWalls, velocity, sprite);
        });
    }

    onrender(ctx) {
        //ctx.beginPath();
        //// TODO don't hard code 64, maybe pass in gamemap.map instead?
        //ctx.arc(0, 0, this.range * 64, 0, 2 * Math.PI);
        //ctx.fillStyle = "#2b2b2b10"
        //ctx.fill();
        //ctx.stroke();
    }
}

async function readfile(url) {
    const resp = await fetch(url);
    if (!resp.ok)
        throw new Error("Could not read file " + url + "!");
    const reader = resp.body.getReader();

    let file = "";
    while (true) {
        const read = await reader.read();
        if (read.value)
            file += String.fromCharCode.apply(null, read.value);
        else
            break;
    }

    return file;
}

async function main() {
    const map = JSON.parse(await readfile("../assets/level1.json"));
    const tilesetImg = new Image();
    await new Promise((r) => {
        tilesetImg.onload = r;
        tilesetImg.src = "../assets/tile_atlas.png";
    });

    const canvas = document.getElementById("display");

    const spriteImgsList = [];
    for (let sprite of spriteList) {
        const spriteImg = new Image();
        await new Promise((r) => {
            spriteImg.onload = r;
            spriteImg.src = sprite;
        });
        spriteImgsList.push(spriteImg);
    }

    const gamemap = new GameMap(map, [96], 253, tilesetImg, 8, spriteImgsList, canvas);

    const base = new BasicBase(0);
    base.position = [map.tsize / 2, map.tsize / 2];
    gamemap.tileTowersMap.set(253, [base]);

    function ft(id, tile) {
        const tower = new FoxTower(id);
        tower.position = [map.tsize / 2, map.tsize / 2];
        if (Math.random() < 0.5) {
            tower.priority = "last";
            tower.spriteFrames.idle.frames[0].filter = `invert(1)`;
        }
        gamemap.tileTowersMap.set(tile, [tower]);
    }

    let startID = 999;
    for (let tile of map.legalTowerTiles)
        ft(startID++, tile);

    const msPerTick = 1000 / 60;

    let spawnLimit = 100;

    setInterval(function() {
        if (spawnLimit) {
            const enemy = new BasicEnemy(10 - spawnLimit, Math.random());
            enemy.position = [map.tsize / 2, map.tsize / 2];
            let i = 1;
            if (Math.random() < 0.75) {
                enemy.velocity *= 2;
                i -= 0.25;
            }
            if (Math.random() < 0.5) {
                enemy.velocity *= 2;
                i -= 0.25;
            }
            if (Math.random() < 0.25) {
                enemy.velocity *= 2;
                i -= 0.25;
            }

            // enemy.velocity = 0.05;

            if (i == 0.25)
                i = 0;
            else if (i == 0.5)
                i = 0.25;
            enemy.spriteFrames.map(s => {
                s.filter = `invert(${i})`;
            });
            spawnLimit--;

            // const enemy1 = new BasicEnemy(10 - spawnLimit, 0.9 / 99);
            // enemy1.position = [map.tsize / 2, map.tsize / 2];
            // spawnLimit--;
            // console.log(enemy.spawnID, enemy1.spawnID);

            if (!gamemap.tileEnemiesMap.has(96))
                gamemap.tileEnemiesMap.set(96, []);
            gamemap.tileEnemiesMap.get(96).push(enemy);
        }
    }, msPerTick * 5);

    let lastTickTime = 0;
    function render(request) {
        const currTime = (new Date()).getTime();
        if (!request || (currTime - lastTickTime > msPerTick)) {
            lastTickTime = currTime;
            gamemap.ontick();
        }

        if (request)
            requestAnimationFrame(render);
    }

    render(true);

    document.getElementById("step").onclick = () => { render(false); };
}

document.addEventListener('DOMContentLoaded', (event) => {
   main();
});
