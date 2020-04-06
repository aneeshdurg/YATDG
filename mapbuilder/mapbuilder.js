const TILEWIDTH = 64;
const TILEHEIGHT = 64;
const MAPWIDTH = 16;
const MAPHEIGHT = 16;
const TILESPERROW = 8;

async function main() {
    const draw_canvas = document.getElementById("display");
    draw_canvas.width = TILEWIDTH * MAPWIDTH;
    draw_canvas.height = TILEHEIGHT * MAPHEIGHT;

    const draw_ctx = draw_canvas.getContext("2d");

    const img = new Image();
    await new Promise((r) => {
        img.onload = r;
        img.src = "./tile_atlas.png";
    });

    const picker_canvas = document.getElementById("imgatlas");
    picker_canvas.width = img.width;
    picker_canvas.height = img.height + TILEHEIGHT;
    const picker_ctx = picker_canvas.getContext("2d");
    let tower_selected = false;
    let path_selected = false;
    let pathStart = null;
    let selected_tile = 0;
    const max_tile = (img.width / TILEWIDTH) * (img.height / TILEHEIGHT) + 1;
    function pickerEvent(e) {
        picker_ctx.clearRect(0, 0, picker_canvas.width, picker_canvas.height);
        picker_ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, img.width, img.height);
        if (e != null) {
            // update selected_tile
            const rect = picker_canvas.getBoundingClientRect();
            let x = Math.round(picker_canvas.width * (e.clientX - rect.left) / rect.width);
            x = Math.floor(x / TILEWIDTH);

            let y = Math.round(picker_canvas.height  * (e.clientY - rect.top) / rect.height);
            y = Math.floor(y / TILEHEIGHT);

            selected_tile = 1 + x + y * TILESPERROW;
        }

        if (selected_tile != 0) {
            const idx = selected_tile - 1;
            picker_ctx.beginPath();
            picker_ctx.lineWidth = "4";
            picker_ctx.strokeStyle = "black";
            let idxX = TILEWIDTH * (idx % TILESPERROW);
            let idxY = TILEHEIGHT * Math.floor(idx / TILESPERROW);
            picker_ctx.rect(idxX + 4, idxY + 4, TILEWIDTH - 8, TILEHEIGHT - 8);
            picker_ctx.stroke();
        }

        picker_ctx.font = '64px monospace';
        picker_ctx.fillText('T', 15, picker_canvas.height - 15, 64);
        picker_ctx.fillText('P', 15 + 64, picker_canvas.height - 15, 64);

        tower_selected = false;
        path_selected = false;
        pathStart = null;
        if (selected_tile >= max_tile) {
            if (selected_tile == max_tile)
                tower_selected = true;
            else if (selected_tile == max_tile + 1)
                path_selected = true;

            selected_tile = 0;
        }
    }
    picker_canvas.onclick = pickerEvent;
    pickerEvent();

    var map = {
        cols: MAPWIDTH,
        rows: MAPHEIGHT,
        tsize: 64,
        tiles: new Array(MAPWIDTH * MAPHEIGHT),
        legalTowerTiles: new Set(),
        edgeMap: {},
    };
    map.tiles.fill(0);

    function getTile(map, col, row) {
        return map.tiles[row * map.cols + col]
    }

    function drawMap() {
        for (var c = 0; c < map.cols; c++) {
            for (var r = 0; r < map.rows; r++) {
                var tile = getTile(map, c, r);
                if (tile !== 0) { // 0 => empty tile
                    const idx = tile - 1;
                    draw_ctx.drawImage(
                        img, // image
                        (idx % TILESPERROW) * map.tsize, // source x
                        Math.floor(idx / TILESPERROW) * map.tsize, // source y
                        map.tsize, // source width
                        map.tsize, // source height
                        c * map.tsize, // target x
                        r * map.tsize, // target y
                        map.tsize, // target width
                        map.tsize // target height
                    );
                }
            }
        }

        function idxToXY(idx) {
            const x = TILEWIDTH * (idx % MAPWIDTH);
            const y = TILEHEIGHT * Math.floor(idx / MAPWIDTH);
            return [x, y];
        }

        map.legalTowerTiles.forEach((idx) => {
            draw_ctx.font = TILEWIDTH + 'px monospace';
            const coords = idxToXY(idx);
            draw_ctx.fillText('T', coords[0] + 15, coords[1] + TILEHEIGHT - 15);
        });

        Object.keys(map.edgeMap).forEach((start) => {
            const startCoords = idxToXY(start);
            map.edgeMap[start].forEach((end) => {
                const endCoords = idxToXY(end);
                draw_ctx.lineWidth = "8";
                const grad = draw_ctx.createLinearGradient(startCoords[0], startCoords[1], endCoords[0], endCoords[1]);
                grad.addColorStop(0, "white");
                grad.addColorStop(1, "green");

                draw_ctx.strokeStyle = grad;
                draw_ctx.beginPath();
                draw_ctx.moveTo(startCoords[0] + TILEWIDTH / 2, startCoords[1] + TILEHEIGHT / 2);
                draw_ctx.lineTo(endCoords[0] + TILEWIDTH / 2, endCoords[1] + TILEHEIGHT / 2);
                draw_ctx.stroke();
            });
        });

        if (pathStart != null) {
            draw_ctx.beginPath();
            draw_ctx.lineWidth = "4";
            draw_ctx.strokeStyle = "black";
            const startCoords = idxToXY(pathStart);
            draw_ctx.rect(startCoords[0] + 4, startCoords[1] + 4, TILEWIDTH - 8, TILEHEIGHT - 8);
            draw_ctx.stroke();
        }
    }

    function drawingEvent(e, erase) {
        draw_ctx.fillStyle = "#2b2b2b";
        draw_ctx.fillRect(0, 0, draw_canvas.width, draw_canvas.height);

        if (e != null) {
            // update selected_tile with selected tile
            const rect = draw_canvas.getBoundingClientRect();
            let x = Math.round(draw_canvas.width * (e.clientX - rect.left) / rect.width);
            let y = Math.round(draw_canvas.height  * (e.clientY - rect.top) / rect.height);

            x = Math.floor(x / TILEWIDTH);
            y = Math.floor(y / TILEHEIGHT);

            if (tower_selected) {
                if (!erase)
                    map.legalTowerTiles.add(x + y * MAPWIDTH);
                else
                    map.legalTowerTiles.delete(x + y * MAPWIDTH);
            } else if (path_selected) {
                if (erase) {
                    if (pathStart != null)
                        pathStart = null;
                    else
                        delete map.edgeMap[x + y * MAPWIDTH];
                } else {
                    if (pathStart == null) {
                        pathStart = x + y * MAPWIDTH;
                    } else {
                        const pathEnd = x + y * MAPWIDTH;
                        if (!(pathStart in map.edgeMap))
                            map.edgeMap[pathStart] = []
                        map.edgeMap[pathStart].push(pathEnd);
                        pathStart = null;
                    }
                }
            } else
                map.tiles[x + y * MAPWIDTH] = selected_tile;
        }

        drawMap();
    }
    draw_canvas.onclick = drawingEvent;
    draw_canvas.oncontextmenu = function(e) {
        const temp_tile = selected_tile;
        selected_tile = 0;
        drawingEvent(e, true);
        selected_tile = temp_tile;
        e.preventDefault();
    }
    drawingEvent();

    document.getElementById("downloader").onclick = function() {
        map.legalTowerTiles = [...map.legalTowerTiles];
        const map_data = JSON.stringify(map);
        map.legalTowerTiles = new Set(map.legalTowerTiles);

        const el = document.createElement('a');
        el.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(map_data));
        el.setAttribute('download', 'map.json');
        el.style.display = 'none';
        document.body.appendChild(el);
        el.click();
        document.body.removeChild(el);
    };
}
