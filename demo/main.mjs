import {GameMap} from "../src/gamemap.mjs"
import {VMath} from "../src/vmath.mjs"
import {Obstacle} from "../src/obstacles.mjs"

import {LookupSprite, spriteList} from "./sprites.mjs"
import {BasicEnemy, BasicBoss} from "./enemies.mjs"
import {BasicBase, SpiderTower, FoxTower, ThumbTack} from "./towers.mjs"

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
let victory = false;
export function gameover(_victory) {
    _gameover = true;
    victory = Boolean(_victory);
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

    let lastClickedEl = null;

    const buttons = [
        document.getElementById("foxbutton"),
        document.getElementById("spiderbutton"),
        document.getElementById("tacksbutton")];

    const setLastClicked = (button, e) => {
        buttons.forEach(b => { b.classList.remove("button-selected"); });
        if (lastClickedEl != button) {
            lastClickedEl = button;
            button.classList.add("button-selected");
        } else {
            lastClickedEl = null;
        }
    };

    buttons.forEach(button => { button.addEventListener("click", setLastClicked.bind(null, button)); });

    let selectedTower = null;

    const menu = document.getElementById("menu");
    const upgrademenu = document.getElementById("upgrademenu");

    function selectTower(tower) {
        menu.style.display = "none";

        upgrademenu.style.display = "";
        upgrademenu.innerHTML = `<h2>${tower.name}</h2><hr>`;

        tower.onselect(upgrademenu);

        tower.upgrades.currentLeaves.forEach((upgrade, id) => {
            const upgradebtn = document.createElement("div");
            upgradebtn.classList.add("button");
            upgradebtn.style = "text-align: left";
            if (upgrade.icon) {
                //  TODO display icon
            }

            upgradebtn.innerHTML += `${upgrade.description}<br>Price: ${upgrade.price}`;
            upgradebtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                // TODO grey out btn until money is sufficient
                if (playerMoney < upgrade.price)
                    return;

                playerMoney -= upgrade.price;
                tower.upgrades.upgrade(upgrade);
                selectTower(tower);
            };
            upgrademenu.appendChild(upgradebtn);
        });

        tower.rendersRange = true;
        selectedTower = tower;
    }

    function deselectTower() {
        menu.style.display = "";
        upgrademenu.style.display = "none";
        selectedTower.rendersRange = false;
        selectedTower = null;
    }

    document.getElementById("container").addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();

        if (selectedTower) {
            deselectTower();
            return;
        }
    });

    canvas.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();

        let noActions = false;
        if (selectedTower) {
            deselectTower();
            noActions = true;
        }

        const coords = getTileCoords(e, canvas);

        if (gamemap.tileTowersMap.has(coords.tile)) {
            const tileTowers = gamemap.tileTowersMap.get(coords.tile);
            if (tileTowers.length == 1 && !(tileTowers[0] instanceof Obstacle)) {
                selectTower(tileTowers[0]);
                return;
            }
        }

        if (noActions)
            return;

        let newTower = null;

        if (lastClickedEl) {
            const price = Number(lastClickedEl.dataset.price);
            if (isNaN(price))
                return;
            if (playerMoney < price)
                return;
            playerMoney -= price;

            if (lastClickedEl.id == "foxbutton") {
                if (!gamemap.legalTowerPositionsSet.has(coords.tile))
                    return;

                newTower = new FoxTower(vendor.id);
            } else if (lastClickedEl.id == "spiderbutton") {
                if (!gamemap.legalTowerPositionsSet.has(coords.tile))
                    return;

                newTower = new SpiderTower(vendor.id);
            } else if (lastClickedEl.id == "tacksbutton") {
                if (!gamemap.edgeMap.has(coords.tile))
                    return;

                newTower = new ThumbTack(vendor.id);
            }
        }

        if (newTower) {
            if (!gamemap.tileTowersMap.has(coords.tile))
                gamemap.tileTowersMap.set(coords.tile, []);
            gamemap.tileTowersMap.get(coords.tile).push(newTower);
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
        let timer = setInterval(function() {
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
        if (!_gameover) {
            playerMoney += 10 * smul;
            clearInterval(timer);
        }
        document.getElementById("spawn").onclick = spawnWave;
    }
    document.getElementById("spawn").onclick = spawnWave;
    //spawnWave();

    let lastTickTime = 0;
    let stopRendering = null;
    let rendering = false;
    function render(request) {
        if (request)
            rendering = true;
        const currTime = (new Date()).getTime();
        const delta = currTime - lastTickTime;
        if (!request || (delta > msPerTick)) {
            lastTickTime = currTime;
            gamemap.ontick();
            document.getElementById("money").innerText = `Money: ${playerMoney}`;
            const mspf = (new Date()).getTime() - currTime + delta;
            const fps = Math.round(1000 / mspf);
            const idk = mspf - delta;
            document.getElementById("fps").innerText = `FPS: ${fps}, ${idk}`;
            document.getElementById("entitycount").innerText = `Entity Count: ${vendor._id}`;
        }

        if (request && !_gameover) {
            if (stopRendering) {
                stopRendering();
                stopRendering = null;
                rendering = false;
                return;
            }
            requestAnimationFrame(render);
        }
        else if (_gameover) {
            if (victory)
                alert("You won!");
            else
                alert("You lost!");
        }
    }

    render(true);

    document.getElementById("step").onclick = async () => {
        if (rendering) {
            const p = new Promise(r => { stopRendering = r; });
            await p;
        }
        render(false);
    };
    document.getElementById("resume").onclick = () => { render(true); };
}

document.addEventListener('DOMContentLoaded', (event) => {
   main();
});
