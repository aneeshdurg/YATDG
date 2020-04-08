import {GameMap, Sprite} from "./gamemap.mjs"
import {Enemy} from "./enemies.mjs"

const spriteList = [
    "../enemy0.png",
    "../enemy1.png",
    "../enemy2.png",
];

class BasicEnemy extends Enemy {
    spriteFrames = [new Sprite(0), new Sprite(1), new Sprite(2)]   // spritelist idxs
    ticksPerSpriteTransition = 5 // number of ticks for each frame in the list above

    hp = 0
    velocity = 0.05 // horzt/vert velocity in blocks per tick
    attacksTowers = false
    range = 0 // radius of range for tower attacks in blocks

    spawnOnDeath = [] // enemies to spawn on death
    resistances = [] // Resistances to attack types
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
    const map = JSON.parse(await readfile("../level1.json"));
    const tilesetImg = new Image();
    await new Promise((r) => {
        tilesetImg.onload = r;
        tilesetImg.src = "../tile_atlas.png";
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
    const msPerTick = 1000 / 60;

    let spawnLimit = 100;

    setInterval(function() {
        if (spawnLimit) {
            const enemy = new BasicEnemy(10 - spawnLimit, Math.random());
            enemy.position = [map.tsize / 2, map.tsize / 2];
            const origVelocity = enemy.velocity;
            if (Math.random() < 0.75)
                enemy.velocity *= 2;
            if (Math.random() < 0.5)
                enemy.velocity *= 2;
            if (Math.random() < 0.25)
                enemy.velocity *= 2;

            const i = (enemy.velocity - origVelocity) * 2.5;
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
