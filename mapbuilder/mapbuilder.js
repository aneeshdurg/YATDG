class Map {
    cols = 16
    rows = 16
    tsize = 64
    tiles = null
    legalTowerTiles = new Set()
    edgeMap = {}

    constructor() {
        this.tiles = new Array(this.cols * this.rows);
        this.tiles.fill(0);
    }

    getTile(col, row) {
        return this.tiles[row * this.cols + col]
    }

    toString() {
        return JSON.stringify({
            cols: this.cols,
            rows: this.rows,
            tsize: this.tsize,
            tiles: this.tiles,
            legalTowerTiles: [...map.legalTowerTiles],
            edgeMap: this.edgeMap,
        });
    }
}

class Picker {
    tower_selected = false
    path_selected = false
    pathStart = null
    selected_tile = 0

    constructor(id, img, tileWidth, tileHeight, tilesPerRow) {
        this.img = img;

        this.tilesPerRow = tilesPerRow;
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;
        this.max_tile = (this.img.width / this.tileWidth) * (this.img.height / this.tileHeight) + 1;

        this.canvas = document.getElementById("imgatlas");
        this.canvas.width = this.img.width;
        this.canvas.height = this.img.height + this.tileWidth;

        this.ctx = this.canvas.getContext("2d");
        this.canvas.onclick = this.onclick.bind(this);
        this.onclick();
    }

    onclick(e) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.img, 0, 0);
        if (e != null) {
            // update selected_tile
            const rect = this.canvas.getBoundingClientRect();
            let x = Math.round(this.canvas.width * (e.clientX - rect.left) / rect.width);
            x = Math.floor(x / this.tileWidth);

            let y = Math.round(this.canvas.height  * (e.clientY - rect.top) / rect.height);
            y = Math.floor(y / this.tileHeight);

            this.selected_tile = 1 + x + y * this.tilesPerRow;
        }

        if (this.selected_tile != 0) {
            const idx = this.selected_tile - 1;
            this.ctx.beginPath();
            this.ctx.lineWidth = "4";
            this.ctx.strokeStyle = "black";
            let idxX = this.tileWidth * (idx % this.tilesPerRow);
            let idxY = this.tileHeight * Math.floor(idx / this.tilesPerRow);
            this.ctx.rect(idxX + 4, idxY + 4, this.tileWidth - 8, this.tileHeight - 8);
            this.ctx.stroke();
        }

        this.ctx.font = '64px monospace';
        this.ctx.fillText('T', 15, this.canvas.height - 15, 64);
        this.ctx.fillText('P', 15 + 64, this.canvas.height - 15, 64);

        this.tower_selected = false;
        this.path_selected = false;
        this.pathStart = null;
        if (this.selected_tile >= this.max_tile) {
            if (this.selected_tile == this.max_tile)
                this.tower_selected = true;
            else if (this.selected_tile == this.max_tile + 1)
                this.path_selected = true;

            this.selected_tile = 0;
        }
    }
}

class Painter {
    constructor(id, picker, map) {
        this.canvas = document.getElementById(id);
        this.canvas.width = picker.tileWidth * map.cols;
        this.canvas.height = picker.tileHeight * map.rows;
        this.ctx = this.canvas.getContext("2d");

        this.picker = picker;
        this.map = map;
        this.canvas.onclick = this.onclick.bind(this, false);
        const that = this;
        that.canvas.oncontextmenu = function(e) {
            e.preventDefault();

            const temp_tile = that.picker.selected_tile;
            that.picker.selected_tile = 0;
            that.onclick(true, e);
            that.picker.selected_tile = temp_tile;
        }
        this.onclick(false);
    }

    drawExistingMap() {
        for (var c = 0; c < this.map.cols; c++) {
            for (var r = 0; r < this.map.rows; r++) {
                var tile = this.map.getTile(c, r);
                if (tile !== 0) { // 0 => empty tile
                    const idx = tile - 1;
                    this.ctx.drawImage(
                        this.picker.img, // image
                        (idx % this.picker.tilesPerRow) * this.map.tsize, // source x
                        Math.floor(idx / this.picker.tilesPerRow) * this.map.tsize, // source y
                        this.map.tsize, // source width
                        this.map.tsize, // source height
                        c * this.map.tsize, // target x
                        r * this.map.tsize, // target y
                        this.map.tsize, // target width
                        this.map.tsize // target height
                    );
                }
            }
        }
    }

    idxToXY(idx) {
        const x = this.picker.tileWidth * (idx % this.map.cols);
        const y = this.picker.tileHeight * Math.floor(idx / this.map.cols);
        return [x, y];
    }

    drawEdgePaths() {
        Object.keys(this.map.edgeMap).forEach((start) => {
            const startCoords = this.idxToXY(start);
            startCoords[0] += this.picker.tileWidth / 2;
            startCoords[1] += this.picker.tileHeight / 2;

            this.map.edgeMap[start].forEach((end) => {
                const endCoords = this.idxToXY(end);
                endCoords[0] += this.picker.tileWidth / 2;
                endCoords[1] += this.picker.tileHeight / 2;

                this.ctx.lineWidth = "8";
                const grad = this.ctx.createLinearGradient(startCoords[0], startCoords[1], endCoords[0], endCoords[1]);
                grad.addColorStop(0, "white");
                grad.addColorStop(1, "#00FF00");

                this.ctx.strokeStyle = grad;
                this.ctx.beginPath();
                this.ctx.moveTo(startCoords[0], startCoords[1]);
                this.ctx.lineTo(endCoords[0], endCoords[1]);
                this.ctx.stroke();
            });
        });

        // Highlight tile selected for the start of the path
        if (this.picker.pathStart != null) {
            this.ctx.beginPath();
            this.ctx.lineWidth = "4";
            this.ctx.strokeStyle = "black";
            const startCoords = this.idxToXY(this.picker.pathStart);
            this.ctx.rect(startCoords[0] + 4, startCoords[1] + 4, this.picker.tileWidth - 8, this.picker.tileHeight - 8);
            this.ctx.stroke();
        }
    }

    drawMap() {
        this.drawExistingMap();

        this.map.legalTowerTiles.forEach((idx) => {
            this.ctx.font = this.picker.tileWidth + 'px monospace';
            const coords = this.idxToXY(idx);
            this.ctx.fillText('T', coords[0] + 15, coords[1] + this.picker.tileHeight - 15);
        });

        this.drawEdgePaths();
    }

    onclick(erase, e) {
        this.ctx.fillStyle = "#2b2b2b";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (e != null) {
            // update selected_tile with selected tile
            const rect = this.canvas.getBoundingClientRect();
            let x = Math.round(this.canvas.width * (e.clientX - rect.left) / rect.width);
            let y = Math.round(this.canvas.height  * (e.clientY - rect.top) / rect.height);

            x = Math.floor(x / this.picker.tileWidth);
            y = Math.floor(y / this.picker.tileHeight);

            let tileID = x + y * this.map.cols;

            if (this.picker.tower_selected) {
                if (!erase)
                    this.map.legalTowerTiles.add(tileID);
                else
                    this.map.legalTowerTiles.delete(tileID);
            } else if (this.picker.path_selected) {
                if (erase) {
                    if (this.picker.pathStart != null)
                        this.picker.pathStart = null;
                    else
                        delete this.map.edgeMap[tileID];
                } else {
                    if (this.picker.pathStart == null) {
                        this.picker.pathStart = tileID;
                    } else {
                        const pathEnd = tileID;
                        if (!(this.picker.pathStart in this.map.edgeMap))
                            this.map.edgeMap[this.picker.pathStart] = []
                        this.map.edgeMap[this.picker.pathStart].push(pathEnd);
                        this.picker.pathStart = null;
                    }
                }
            } else
                this.map.tiles[tileID] = this.picker.selected_tile;
        }

        this.drawMap();
    }
}

async function main() {
    const map = new Map();

    const img = new Image();
    await new Promise((r) => {
        img.onload = r;
        img.src = "../assets/tile_atlas.png";
    });

    const TILEWIDTH = 64;
    const TILEHEIGHT = 64;
    const TILESPERROW = 8;
    const picker = new Picker("imgatlas", img, TILEWIDTH, TILEHEIGHT, TILESPERROW);

    const painter = new Painter("display", picker, map);

    document.getElementById("downloader").onclick = function() {
        const el = document.createElement('a');
        el.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(map.toString()));
        el.setAttribute('download', 'map.json');
        el.style.display = 'none';
        document.body.appendChild(el);
        el.click();
        document.body.removeChild(el);
    };

    document.getElementById("input").addEventListener("change", async function() {
        const file = this.files[0];
        document.getElementById("filecontents").value = await file.text();
        document.getElementById("filepanel").style.display = "";
    });

    document.getElementById("load").addEventListener("click", async function() {
        const filecontents = document.getElementById("filecontents");
        const newMap = JSON.parse(filecontents.value);
        map.cols = newMap.cols;
        map.cols = newMap.rows;
        map.tsize = newMap.tsize;
        // TODO resize the canvas here
        map.tiles = newMap.tiles;
        map.legalTowerTiles = new Set(newMap.legalTowerTiles);
        map.edgeMap = newMap.edgeMap;

        document.getElementById("filepanel").style.display = "none";

        painter.onclick();
    });
}
