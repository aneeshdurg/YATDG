export class VMath {
    static _vop(x, y, op) {
        const xArr = x instanceof Array;
        const yArr = y instanceof Array;
        if (!xArr && !yArr)
            return op(x, y);
        else if (xArr && yArr)
           return x.map((x, i) => op(x, y[i]));
        else if (xArr)
           return x.map((x, i) => op(x, y));
        else
            return y.map((y, i) => op(y, x));
    }

    static add(x, y) {
        return VMath._vop(x, y, (x, y) => x + y);
    }

    static sub(x, y) {
        return VMath._vop(x, y, (x, y) => x - y);
    }

    static mul(x, y) {
        return VMath._vop(x, y, (x, y) => x * y);
    }

    static magnitude(x) {
        if (x instanceof Array)
            return Math.sqrt(Math.pow(x[0], 2) + Math.pow(x[1], 2));
        return x;
    }

    static copy(x) {
        if (x instanceof Array) {
            const xCopy = [];
            x.forEach(e => xCopy.push(e));
            return xCopy;
        }

        return x;
    }

    static equal(x, y) {
        const xArr = x instanceof Array;
        const yArr = y instanceof Array;
        if (!xArr && !yArr)
            return x == y;
        else if (xArr && yArr) {
            if (x.length != y.length)
                return false;
            for (let i = 0; i < x.length; i++) {
                if (x[i] != y[i])
                    return false
            }
            return true;
        } else
            return false;
    }
}
