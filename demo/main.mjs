import {GameMap, Sprite} from "../src/gamemap.mjs"
import {Enemy} from "../src/enemies.mjs"
import {Base} from "../src/base.mjs"

const spriteList = [
    "../assets/enemy/0.png",
    "../assets/enemy/1.png",
    "../assets/enemy/2.png",
    "../assets/base/0.png",
    "../assets/base/1.png",
    "../assets/base/2.png",
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
    ticksPerSpriteTransition = 10
    hp = 100
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

    const gamemap = new GameMap(map, tilesetImg, 8, spriteImgsList, canvas);
    const base = new BasicBase(0);
    base.position = [map.tsize / 2, map.tsize / 2];
    gamemap.tileTowersMap.set(253, [base]);
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
