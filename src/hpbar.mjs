// class for rendering an HP bar
export class HPBar {
    constructor(totalHP, width, height) {
        this.totalHP = totalHP;
        this.width = width;
        this.height = height;

        this.hp = totalHP;
    }

    update(hp) {
        this.hp = hp;
    }

    render(ctx) {
        ctx.beginPath();
        ctx.lineWidth = "2";
        ctx.rect(0, 0, this.width, this.height);
        ctx.fillStyle = "red";
        ctx.fillRect(0, 0, this.width * this.hp / this.totalHP, this.height);
        ctx.stroke();
    }
}
