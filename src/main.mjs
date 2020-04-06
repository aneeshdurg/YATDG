import {GameMap} from "./gamemap.mjs"
import {Enemy} from "./enemies.mjs"

class BasicEnemy extends Enemy {
    spriteFrames = []   // spritelist idxs
    ticksPerSpriteTransition = 0 // number of ticks for each frame in the list above

    hp = 0
    velocity = [0, 0] // horzt/vert velocity in blocks per tick
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

    const gamemap = new GameMap(map, tilesetImg, 8, canvas);

    const msPerTick = 1000 / 30;

    let lastTickTime = 0;
    (function render() {
        const currTime = (new Date()).getTime();
        if (currTime - lastTickTime > msPerTick) {
            lastTickTime = currTime;
            gamemap.renderBackground();
        }
        requestAnimationFrame(render);
    })()
}

document.addEventListener('DOMContentLoaded', (event) => {
   main();
});
