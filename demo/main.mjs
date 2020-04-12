import {Base} from "../src/base.mjs"
import {Bullet} from "../src/bullets.mjs"
import {Enemy} from "../src/enemies.mjs"
import {GameMap} from "../src/gamemap.mjs"
import {HPBar} from "../src/hpbar.mjs"
import {Obstacle} from "../src/obstacles.mjs"
import {SpawnEvent} from "../src/events.mjs"
import {Sprite, Attack} from "../src/entity.mjs"
import {Tower, TowerAbility} from "../src/towers.mjs"
import {VMath} from "../src/vmath.mjs"

class IDVendor {
    constructor() {
        this._id = 0;
    }

    get id() {
        return this._id++;
    }
}
const vendor = new IDVendor();

const spriteList = [
    "../assets/enemy/0.png",
    "../assets/enemy/1.png",
    "../assets/enemy/2.png",

    "../assets/enemy/dying0.png",
    "../assets/enemy/dying1.png",
    "../assets/enemy/dying2.png",

    "../assets/base/0.png",
    "../assets/base/1.png",
    "../assets/base/2.png",

    "../assets/foxTower.png",
    "../assets/arrow.png",

    "../assets/thumbTacks.png",
];

class LookupSprite extends Sprite {
    constructor(name, filter) {
        super(spriteList.findIndex(f => f.includes(name)), filter);
    }
}

class BasicEnemy extends Enemy {
    // TODO don't hardcode this
    position = [32, 32]

    spriteFrames = {
        idle: {
            frames: [
                new LookupSprite("enemy/0.png"),
                new LookupSprite("enemy/1.png"),
                new LookupSprite("enemy/2.png"),
            ],
            tpt: 5,
        },
        dying: {
            frames: [
                new LookupSprite("enemy/dying0.png"),
                new LookupSprite("enemy/dying1.png"),
                new LookupSprite("enemy/dying2.png"),
            ],
            tpt: 3,
        },
    }

    hp = 1
    velocity = 0.05 // horzt/vert velocity in blocks per tick
    attacksTowers = false
    range = 0 // radius of range for tower attacks in blocks
    strength = 1

    resistances = [] // Resistances to attack types

    _spawnedChildren = false;

    ontick(movementCallback, eventsCallback) {
        const retval = super.ontick(movementCallback, eventsCallback);
        if (this.hp == 0 && !this._spawnedChildren && this.velocity != 0.05 && !this._deathByBase) {
            this._spawnedChildren = true;

            const e1 = new BasicEnemy(vendor.id, Math.random());
            e1.position[0] = Math.floor(Math.random() * this.position[0]);
            e1.position[1] = Math.floor(Math.random() * this.position[1]);
            e1.spriteFrames.idle.frames.map(f => {
                f.filter = 'grayscale(1)';
            });
            e1.spriteFrames.dying.frames.map(f => {
                f.filter = 'grayscale(1)';
            });

            const e2 = new BasicEnemy(vendor.id, Math.random());
            e2.position[0] = Math.floor(Math.random() * this.position[0]);
            e2.position[1] = Math.floor(Math.random() * this.position[1]);
            e2.spriteFrames.idle.frames.map(f => {
                f.filter = 'grayscale(1)';
            });
            e2.spriteFrames.dying.frames.map(f => {
                f.filter = 'grayscale(1)';
            });

            eventsCallback([new SpawnEvent([e1, e2])]);
        }

        return retval;
    }
}

var gameover = false;
class BasicBase extends Base {
    spriteFrames = {
        idle: {
            frames: [
                new LookupSprite("base/0.png"),
                new LookupSprite("base/1.png"),
                new LookupSprite("base/2.png"),
            ],
            tpt: 5
        }
    }

    hp = 100

    constructor(spawnID) {
        super(spawnID);
        this.hpbar = new HPBar(this.hp, 64, 4);
    }

    ondeath() {
        gameover = true;
    }

    ondamage(atk) {
        super.ondamage(atk);
        this.hpbar.update(this.hp);
        const death = 1 - this.hp / this.hpbar.totalHP;
        if (death != 1)
            this.spriteFrames.idle.tpt = 5 + 20 * death;
        else
            this.spriteFrames.idle.tpt = 0;
         this.spriteFrames.idle.frames.map(frame => { frame.filter = `grayscale(${death})`; });
    }

    onrender(ctx) {
        ctx.translate(-this.position[0], -(this.position[1] + 1));
        this.hpbar.render(ctx);
        ctx.translate(this.position[0], this.position[1] + 1);
    }
}

class ArrowAttack extends Attack {
    damage = 1
    // TODO add a status effect
}

class Arrow extends Bullet {
    spriteFrames = {
        idle: {
            frames: [new LookupSprite("arrow.png")],
            tpt: 0,
        },
    }

    velocityMagnitude = 0.1
    lifespan = 20
    pierce = 1
    attack = new ArrowAttack()
}

class ArrowAbility extends TowerAbility {
    cooldown = 10
    ability = Arrow
}

class FoxTower extends Tower {
    spriteFrames = {
        idle: {
            frames: [new LookupSprite("foxTower.png")],
            tpt: 0,
        },
    }

    hp = 1
    range = 4
    abilities = [new ArrowAbility()]

    rotationSpeed = 0.1 // in radians per tick
    priority = "first"

    constructor(spawnID) {
        super(spawnID);
        this.rotation = 0;
    }

    ontick(movementCallback, eventsCallback, queryEnemiesCB) {
        return super.ontick((_velIsDir, _vel, _rot, sprite) => {
            const queryRes = queryEnemiesCB(this.range, true);

            const enemies = queryRes.enemies.filter(e => !e.enemy.isFlying);
            const selfCoords = queryRes.selfCoords;

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

                this.abilities.forEach(ability => {
                    const bullet =  ability.ontick();
                    // TODO add some way to spawn this into a different map
                    // instead of the tower map.
                    if (bullet) {
                        const b = new bullet();
                        b.setTower(this);
                        b.setDirection([Math.cos(this.rotation), -Math.sin(this.rotation)]);
                        eventsCallback([new SpawnEvent([b])]);
                    }
                });
            }

            return movementCallback(false, 0, this.rotation, sprite);
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

class ThumbTack extends Obstacle {
    spriteFrames = {
        idle: {
            frames: [new LookupSprite("thumbTacks.png")],
            tpt: 0, // tpt == ticksPerSpriteTransition
        },
    }

    hp = 10

    ondamage(atk) {
        const retval = super.ondamage(atk);
        this.spriteFrames.idle.frames.map(frame => {
            frame.filter = `opacity(${this.hp / 10})`;
        });
        return retval;
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

    const gamemap = new GameMap(
        map,
        {
            spawnPoints: [96],
            baseTile: 253,
        },
        {
            tileset: tilesetImg,
            tilesPerRow: 8,
            spriteList: spriteImgsList,
        },
        canvas);

    const base = new BasicBase(vendor.id);
    base.position = [map.tsize / 2, map.tsize / 2];
    gamemap.tileTowersMap.set(253, [base]);

    function ft(tile) {
        if (Math.random() < 0.75)
            return;
        const tower = new FoxTower(vendor.id);
        tower.position = [map.tsize / 2, map.tsize / 2];
        if (Math.random() < 0.5) {
            tower.priority = "last";
            tower.spriteFrames.idle.frames[0].filter = `invert(1)`;
        }
        gamemap.tileTowersMap.set(tile, [tower]);
    }

    for (let tile of map.legalTowerTiles)
        ft(tile);

    const tacks = new ThumbTack(vendor.id);
    tacks.position = [map.tsize / 2, map.tsize / 2];
    gamemap.tileTowersMap.set(237, [tacks]);


    const tacks1 = new ThumbTack(vendor.id);
    tacks1.position = [map.tsize / 2, map.tsize / 2];
    gamemap.tileTowersMap.set(97, [tacks1]);


    const msPerTick = 1000 / 60;

    let spawnLimit = 100;

    setInterval(function() {
        if (spawnLimit) {
            const enemy = new BasicEnemy(vendor.id, Math.random());
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

            if (i == 0.25)
                i = 0;
            else if (i == 0.5)
                i = 0.25;

            enemy.spriteFrames.idle.frames.map(f => {
                f.filter = `invert(${i})`;
            });

            enemy.spriteFrames.dying.frames.map(f => {
                f.filter = `invert(${i})`;
            });

            spawnLimit--;

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

        if (request && !gameover)
            requestAnimationFrame(render);
        else if (gameover)
            alert("You lost!");
    }

    render(true);

    document.getElementById("step").onclick = () => { render(false); };
}

document.addEventListener('DOMContentLoaded', (event) => {
   main();
});
