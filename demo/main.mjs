import {GameMap} from "../src/gamemap.mjs"
import {VMath} from "../src/vmath.mjs"

import {LookupSprite, spriteList} from "./sprites.mjs"
import {BasicEnemy, BasicBoss} from "./enemies.mjs"
import {BasicBase, FoxTower, FlameArrowAbility, ThumbTack} from "./towers.mjs"

class IDVendor {
    constructor() {
        this._id = 0;
    }

    get id() {
        return this._id++;
    }
}

export const vendor = new IDVendor();

let playerMoney = 100;
export function updateMoney(delta) {
    playerMoney += delta;
}

let _gameover = false;
export function gameover() {
    _gameover = true;
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

    function ft(tile, invert) {
        const tower = new FoxTower(vendor.id);
        tower.position = [map.tsize / 2, map.tsize / 2];
        if (invert) {
            tower.priority = "last";
            tower.spriteFrames.idle.frames[0].filter = `invert(1)`;
        } else {
            tower.abilities.push(new FlameArrowAbility());
        }
        gamemap.tileTowersMap.set(tile, [tower]);
    }

    function getTileCoords(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        let mousePos = VMath.sub([e.clientX, e.clientY], [rect.left, rect.top]);
        mousePos = VMath.mul(mousePos, [
            canvas.width / (rect.right - rect.left),
            canvas.height / (rect.bottom - rect.top),
        ]);
        const tileCoords = VMath.mul(mousePos, 1 / map.tsize).map(Math.floor);
        const tile = tileCoords[1] * map.cols + tileCoords[0];
        const position = mousePos.map(x => x % map.tsize);
        return {
            mousePos: mousePos,
            tileCoords: tileCoords,
            tile: tile,
            position: position,
        };
    }

    let lastClickedID = "";

    const buttons = [
        document.getElementById("foxbutton"),
        document.getElementById("foxbutton1"),
        document.getElementById("tacksbutton")];

    const setLastClicked = (e) => {
        buttons.forEach(button => { button.style.background = ""; });
        if (lastClickedID != e.target.id) {
            lastClickedID = e.target.id;
            e.target.style.background = "#2b2b2b";
        } else {
            lastClickedID = "";
        }
    };

    buttons.forEach(button => { button.addEventListener("click", setLastClicked); });

    let selectedTower = null;

    canvas.addEventListener("click", e => {
        if (selectedTower) {
            selectedTower.rendersRange = false;
            selectedTower = null;
            return;
        }
        const coords = getTileCoords(e, canvas);


        if (gamemap.tileTowersMap.has(coords.tile)) {
            const tileTowers = gamemap.tileTowersMap.get(coords.tile);
            if (tileTowers.length == 1) {
                selectedTower = tileTowers[0];
                selectedTower.rendersRange = true;
            }

            return;
        }

        if (lastClickedID == "foxbutton") {
            if (playerMoney < 10 || !gamemap.legalTowerPositionsSet.has(coords.tile))
                return;

            playerMoney -= 10;
            ft(coords.tile, true);
        } else if (lastClickedID == "foxbutton1") {
            if (playerMoney < 15 || !gamemap.legalTowerPositionsSet.has(coords.tile))
                return;

            playerMoney -= 15;
            ft(coords.tile, false);
        } else if (lastClickedID == "tacksbutton") {
            if (playerMoney < 1 || !gamemap.edgeMap.has(coords.tile))
                return;

            playerMoney -= 1;
            const newtacks = new ThumbTack(vendor.id);
            if (!gamemap.tileTowersMap.has(coords.tile))
                gamemap.tileTowersMap.set(coords.tile, []);
            gamemap.tileTowersMap.get(coords.tile).push(newtacks);
        }
    });

    const msPerTick = 1000 / 60;

    let smul = 1;
    async function spawnWave() {
        let spawnLimit = 10 * (smul++);
        if (smul == 10)
            spawnLimit = 1;
        document.getElementById("spawn").onclick = () => {};
        let _resolver = null;
        const p = new Promise(r => { _resolver = r; });
        setInterval(function() {
            if (spawnLimit && smul != 10) {
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
            } else if (smul == 10 && spawnLimit) {
                console.log("Spawning boss");
                spawnLimit--;
                const enemy = new BasicBoss(vendor.id, Math.random());
                enemy.position = [map.tsize / 2, map.tsize / 2];

                if (!gamemap.tileEnemiesMap.has(96))
                    gamemap.tileEnemiesMap.set(96, []);
                gamemap.tileEnemiesMap.get(96).push(enemy);
            } else
                _resolver();
        }, msPerTick * 5);
        await p;
        if (!gameover)
            playerMoney += 50;
        document.getElementById("spawn").onclick = spawnWave;
    }
    document.getElementById("spawn").onclick = spawnWave;
    //spawnWave();

    let lastTickTime = 0;
    function render(request) {
        const currTime = (new Date()).getTime();
        const delta = currTime - lastTickTime;
        if (!request || (delta > msPerTick)) {
            lastTickTime = currTime;
            gamemap.ontick();
            document.getElementById("money").innerText = `Money: ${playerMoney}`;
            const mspf = (new Date()).getTime() - currTime + delta;
            const fps = Math.round(1000 / mspf);
            document.getElementById("fps").innerText = `FPS: ${fps}`;
            document.getElementById("entitycount").innerText = `Entity Count: ${vendor._id}`;
        }

        if (request && !_gameover)
            requestAnimationFrame(render);
        else if (_gameover)
            alert("You lost!");
    }

    render(true);

    document.getElementById("step").onclick = () => { render(false); };
}

document.addEventListener('DOMContentLoaded', (event) => {
   main();
});
