var DDP = {
    $stage: null,
    $time: null,
    $score: null,
    types: ["1", "2", "3", "4"],
    rows: 5,
    cols: 4,
    width: 120,
    height: 120,
    matrix: [],
    selected: null,
    time: 60,
    score: 0,
    timeLeft: null,
    timer: null,
    playing: false,
    slient: false,
    bonus: 0,
    id: 0,

    random: function(min, max) {
        if (max == null) {
            max = min;
            min = 0;
        };
        return min + Math.floor(Math.random() * (max - min + 1));
    },

    getRandomType: function() {
        return this.types[this.random(this.types.length - 1)];
    },

    getRandomTypes: function(count) {
        var types = [];
        var typesCount = this.types.length - 1;

        for (var i = 0; i < count; i++) {
            types.push(this.types[this.random(typesCount)]);
        };

        return types;
    },

    shuffle: function(array) {
        var length = array.length;
        var shuffled = Array(length);
        for (var index = 0, rand; index < length; index++) {
            rand = this.random(0, index);
            if (rand !== index) shuffled[index] = shuffled[rand];
            shuffled[rand] = array[index];
        }
        return shuffled;
    },

    swap: function(a, b) {
        var _x = a.x;
        var _y = a.y;
        var _top = a.style.top;
        var _left = a.style.left;

        a.x = b.x;
        a.y = b.y;
        b.x = _x;
        b.y = _y;

        a.style.top = b.style.top;
        a.style.left = b.style.left;
        b.style.top = _top;
        b.style.left = _left;

        this.matrix[b.y][b.x] = {
            type: b.type,
            el: b
        };

        this.matrix[a.y][a.x] = {
            type: a.type,
            el: a
        };
    },

    swapMatrix: function(a, b) {
        var _type = this.matrix[a.y][a.x].type;
        this.matrix[a.y][a.x].type = this.matrix[b.y][b.x].type;
        this.matrix[b.y][b.x].type = _type;
    },

    getFormattedTime: function(seconds) {
        var minutes = Math.floor(seconds / 60);
        var seconds = seconds % 60;
        return (minutes >= 10 ? minutes : "0" + minutes) + ":" + (seconds >= 10 ? seconds : "0" + seconds);
    },

    init: function(element, options) {
        var self = this;

        function transitionendHandler(event) {
            var target = event.target;
            if (target.classList.contains("killed")) target.parentNode.removeChild(target);
        };

        this.$stage = typeof element == "string" ? document.querySelector(element) : element;
        this.$stage.addEventListener("transitionend", transitionendHandler, false);
        this.$stage.addEventListener("msTransitionEnd", transitionendHandler, false);
        this.$stage.addEventListener("webkitTransitionEnd", transitionendHandler, false);

        if (options) {
            if (options.$time) this.$time = typeof options.$time == "string" ? document.querySelector(options.$time) : options.$time;
            if (options.$score) this.$score = typeof options.$score == "string" ? document.querySelector(options.$score) : options.$score;
            if (options.types) this.types = options.types;
            if (options.rows) this.rows = options.rows;
            if (options.cols) this.cols = options.cols;
            if (options.width) this.width = options.width;
            if (options.height) this.height = options.height;
            if (options.time) this.time = options.time;
        };
        this.$stage.style.width = this.cols * this.width + "px";
        this.$stage.style.height = this.rows * this.height + "px";

        if (Hammer) {
            var mc = new Hammer(this.$stage);
            mc.get("swipe").set({
                direction: Hammer.DIRECTION_ALL
            });
            mc.on("tap", function(event) {
                self.handleClick.call(self, event.target);
            }).on("swipeleft swiperight", function(event) {
                var target = event.target;
                var next = self.matrix[target.y][target.x + (event.type == "swipeleft" ? -1 : 1)];
                if (next) self.handleSwipe.call(self, target, next.el);
            }).on("swipeup swipedown", function(event) {
                var target = event.target;
                var next = self.matrix[target.y + (event.type == "swipeup" ? -1 : 1)];
                if (next && next[target.x]) self.handleSwipe.call(self, target, next[target.x].el);
            });
        } else {
            this.$stage.addEventListener("ontouchend" in window ? "touchend" : "click", function(event) {
                self.handleClick.call(self, event.target);
            }, false);
        };
    },

    countdown: function() {
        var self = this;
        this.timeLeft--;
        this.$time.innerHTML = this.getFormattedTime(this.timeLeft);
        this.$time.style.width = this.timeLeft / this.time * 100 + "%";
        if (this.timeLeft > 0) {
            this.timer = setTimeout(function() {
                self.countdown();
            }, 1e3);
        } else {
            setTimeout(function() {
                self.over();
            }, 1e3);
        };
    },

    reset: function() {
        this.score = 0;
        this.$score.innerHTML = "0";
        this.timeLeft = this.time;
        this.$time.style.width = "100%";
        this.$stage.innerHTML = "";
    },

    play: function(skipBuild) {
        var self = this;

        this.bonus = 0;
        this.score = 0;
        this.$score.innerHTML = 0;
        this.timeLeft = this.time;
        this.$time.innerHTML = this.getFormattedTime(this.timeLeft);
        this.$time.style.width = "100%";

        this.timer = setTimeout(function() {
            self.countdown();
        }, 1e3);
        if (!skipBuild) this.build();

        this.playing = true;
    },

    over: function() {
        this.playing = false;
        $("#overLayer").show();
    },

    updateScore: function(points, tile) {
        this.score += points;

        var el = document.createElement("span");
        el.className = "points";
        el.innerHTML = "+" + points;
        $(el).one("animationend webkitAnimationEnd", function() {
            $(this).remove();
        }).appendTo("#stage");

        this.$score.innerHTML = this.score;
    },

    buildTile: function(row, col, type) {
        var self = this;
        var tile = document.createElement("div");
        tile.style.top = row * this.height + "px";
        tile.style.left = col * this.width + "px";
        tile.x = col;
        tile.y = row;
        tile.type = type;
        tile.id = "tile" + this.id++;
        tile.className = "tile type-" + type;

        this.matrix[row][col] = {
            type: type,
            el: tile
        };

        return tile;
    },

    build: function(skipCleanOut, types) {
        var self = this;
        var fragment = document.createDocumentFragment();
        var total = this.rows * this.cols;
        types = types || this.getRandomTypes(total);

        for (var row = 0; row < this.rows; row++) {
            this.matrix[row] = [];
            for (var col = 0; col < this.cols; col++) {
                var type = types.shift();
                if (!type) {
                    this.matrix[row][col] = null;
                    continue;
                };
                fragment.appendChild(this.buildTile(row, col, type));
            };
        };

        Array.prototype.forEach.call(this.$stage.querySelectorAll(".tile"), function(tile) {
            tile.parentNode.removeChild(tile);
        });
        this.$stage.appendChild(fragment);

        if (!skipCleanOut) {
            setTimeout(function() {
                self.cleanOut();
            }, 500);
        };
    },

    handleSwap: function(curr, another) {
        if (!this.playing || this.slient) return;

        this.slient = true;

        if (this.selected) {
            this.selected.classList.remove("selected");
            this.selected = null;
        };

        var self = this;
        curr.classList.add("selected");

        if (another.type == curr.type) {
            this.swap(another, curr);
            curr.classList.remove("selected");
            another.classList.remove("selected");
            this.bonus = 0;
            setTimeout(function() {
                self.swap(another, curr);
                self.slient = false;
            }, 500);
        } else {
            this.swap(another, curr);
            var linkable = this.checkLinkable(another, curr);
            if (!linkable) this.bonus = 0;
            setTimeout(function() {
                if (linkable) {
                    self.killPaths(linkable);

                    setTimeout(function() {
                        self.slient = false;
                        self.fillUp();
                    }, 500);
                } else {
                    self.swap(another, curr);
                    self.slient = false;
                };
                curr.classList.remove("selected");
                another.classList.remove("selected");
            }, 500);
        };
    },

    handleSwipe: function(curr, next) {
        if (!this.playing || this.slient) return;

        this.handleSwap(curr, next);
    },

    handleClick: function(target) {
        if (!this.playing || this.slient) return;

        var self = this;
        var curr = target;
        curr.classList.toggle("selected");

        if (curr.classList.contains("selected")) {
            if (this.selected) {
                var prev = this.selected;
                if (Math.abs(curr.x - prev.x) + Math.abs(curr.y - prev.y) == 1) {
                    this.handleSwap(curr, prev);
                } else {
                    prev.classList.remove("selected");
                    this.selected = curr;
                };
            } else {
                this.selected = curr;
            };
        } else {
            this.selected = null;
        };
    },

    killTile: function(row, col) {
        var tile = this.matrix[row][col];
        if (tile) {
            var el = tile.el;
            if (el) el.classList.add("killed");
            this.matrix[row][col] = null;
        };
    },

    killPath: function(start, end) {
        this.bonus++;
        if (start.x == end.x) {
            // 列
            for (var i = start.y; i <= end.y; i++) {
                this.killTile(i, start.x);
            };
            return Math.abs(start.y - end.y) + 1;
        } else {
            // 行
            for (var i = start.x; i <= end.x; i++) {
                this.killTile(start.y, i);
            };
            return Math.abs(start.x - end.x) + 1;
        };
    },

    killPaths: function(lines) {
        var count = 0;
        var bonus = this.bonus;
        for (var i = 0, l = lines.length; i < l; i++) {
            count += this.killPath(lines[i][0], lines[i][1]);
        };
        this.updateScore(count + bonus, lines[lines.length - 1][1]);
    },

    makePoint: function(x, y) {
        return {
            x: x,
            y: y
        };
    },

    checkLinkable: function(a, b) {
        var lines = [],
            linkable;

        if (a.x == b.x) {
            // 同列
            if (linkable = this.checkLinkableV(a.y < b.y ? a : b, 1)) lines = lines.concat(linkable);
            if (linkable = this.checkLinkableH(a)) lines = lines.concat(linkable);
            if (linkable = this.checkLinkableH(b)) lines = lines.concat(linkable);
        } else {
            // 同行
            if (linkable = this.checkLinkableH(a.x < b.x ? a : b, 1)) lines = lines.concat(linkable);
            if (linkable = this.checkLinkableV(a)) lines = lines.concat(linkable);
            if (linkable = this.checkLinkableV(b)) lines = lines.concat(linkable);
        };

        return lines.length ? lines : false;
    },

    findLinkableLineH: function(xStart, xEnd, y) {
        var pass = true;
        var lines = [];
        var start = this.matrix[y][xStart],
            count = 1,
            prev, end;

        for (var i = xStart + 1; i <= xEnd; i++) {
            var startAll = start.type == "all";
            prev = end;
            end = this.matrix[y][i];

            if (startAll) start.type = prev ? prev.type : end.type;

            if (start.type == end.type || end.type == "all") {
                if (startAll) start.type = "all";
                count++;
            } else {
                if (count >= 3) {
                    lines.push([start.el, prev.el]);
                } else {
                    if (startAll) start.type = "all";
                };
                start = end;
                count = 1;
                if (prev && prev.type == "all") {
                    start = prev;
                    end = null;
                    i--;
                };
            };
        };

        if (count >= 3) {
            lines.push([start.el, end.el]);
        };

        return lines.length ? lines : false;
    },

    findLinkableLineV: function(yStart, yEnd, x) {
        var pass = true;
        var lines = [];
        var start = this.matrix[yStart][x],
            count = 1,
            prev, end;

        for (var i = yStart + 1; i <= yEnd; i++) {
            var startAll = start.type == "all";
            prev = end;
            end = this.matrix[i][x];

            if (startAll) start.type = prev ? prev.type : end.type;

            if (start.type == end.type || end.type == "all") {
                if (startAll) start.type = "all";
                count++;
            } else {
                if (count >= 3) {
                    lines.push([start.el, prev.el]);
                } else {
                    if (startAll) start.type = "all";
                };
                start = end;
                count = 1;
                if (prev && prev.type == "all") {
                    start = prev;
                    end = null;
                    i--;
                };
            };
        };

        if (count >= 3) {
            lines.push([start.el, end.el]);
        };

        return lines.length ? lines : false;
    },

    checkLinkableH: function(tile, plus) {
        var start = Math.max(0, tile.x - 2);
        var end = Math.min(this.cols - 1, tile.x + (plus ? 3 : 2));

        return this.findLinkableLineH(start, end, tile.y);
    },

    checkLinkableV: function(tile, plus) {
        var start = Math.max(0, tile.y - 2);
        var end = Math.min(this.rows - 1, tile.y + (plus ? 3 : 2));

        return this.findLinkableLineV(start, end, tile.x);
    },

    cleanOut: function() {
        var self = this;
        var rows = this.rows;
        var cols = this.cols;
        var lines = [];
        var linkable;

        this.slient = true;

        for (var row = 0; row < rows; row++) {
            if (linkable = this.findLinkableLineH(0, cols - 1, row)) lines = lines.concat(linkable);
        };

        for (var col = 0; col < cols; col++) {
            if (linkable = this.findLinkableLineV(0, rows - 1, col)) lines = lines.concat(linkable);
        };

        if (lines.length) {
            this.killPaths(lines);
            setTimeout(function() {
                self.slient = false;
                self.fillUp();
            }, 500);
        } else {
            this.slient = false;
            if (!this.findPair()) this.build();
        };
    },

    fillUp: function() {
        var self = this;
        var fragment = document.createDocumentFragment();
        var rows = this.rows;
        var cols = this.cols;
        var lucky = (this.bonus % 3 == 0) && !this.$stage.querySelector(".tile.all");
        var empty = 0;
        var rand;

        this.slient = true;

        for (var col = 0; col < cols; col++) {
            var count = 0;
            for (var row = rows - 1; row >= 0; row--) {
                if (!this.matrix[row][col]) {
                    count++;
                } else {
                    if (count > 0) {
                        for (var _row = row + count; _row >= row; _row--) {
                            if (_row - count >= 0) {
                                this.matrix[_row][col] = this.matrix[_row - count][col];
                                this.matrix[_row - count][col] = null;
                            } else {
                                this.matrix[_row][col] = null;
                            };
                            if (this.matrix[_row][col]) {
                                this.matrix[_row][col].el.y = _row;
                                this.matrix[_row][col].el.style.top = _row * this.height + "px";
                            };
                        };
                        empty += count;
                        count = 0;
                    };
                };
                if (row == 0) empty += count;
            };
        };

        if (lucky) rand = this.random(empty - 1);

        for (var col = 0, idx = 0; col < cols; col++) {
            for (var row = 0; row < rows; row++) {
                if (!this.matrix[row][col]) {
                    var tile = this.buildTile(row, col, (lucky && rand == idx) ? "all" : this.getRandomType());
                    fragment.appendChild(tile);
                    idx++;
                };
            };
        };

        this.$stage.appendChild(fragment);

        setTimeout(function() {
            self.slient = false;
            self.cleanOut();
        }, 500);
    },

    findPair: function() {
        var pair = false;
        var rows = this.rows;
        var cols = this.cols;
        var prev, curr;

        for (var row = 0; row < rows; row++) {
            prev = this.matrix[row][0].el;
            for (var col = 1; col < cols; col++) {
                curr = this.matrix[row][col].el;
                if (prev.type != curr.type) {
                    this.swapMatrix(prev, curr);
                    var linkable = this.checkLinkable(prev, curr);
                    this.swapMatrix(prev, curr);
                    if (linkable) {
                        pair = [prev, curr];
                        break;
                    };
                };
                prev = curr;
            };
            if (pair) break;
        };

        if (pair) return pair;

        for (var col = 0; col < cols; col++) {
            prev = this.matrix[0][col].el;
            for (var row = 1; row < rows; row++) {
                curr = this.matrix[row][col].el;
                if (prev.type != curr.type) {
                    this.swapMatrix(prev, curr);
                    var linkable = this.checkLinkable(prev, curr);
                    this.swapMatrix(prev, curr);
                    if (linkable) {
                        pair = [prev, curr];
                        break;
                    };
                };
                prev = curr;
            };
            if (pair) break;
        };

        return pair;
    },

    _export: function() {
        var types = [],
            rows = this.rows,
            cols = this.cols;
        for (var row = 0; row < rows; row++) {
            for (var col = 0; col < cols; col++) {
                types.push(this.matrix[row][col].type);
            };
        };
        return types;
    },

    _table: function() {
        var types = [],
            rows = this.rows,
            cols = this.cols;

        for (var row = 0; row < rows; row++) {
            types[row] = [];
            for (var col = 0; col < cols; col++) {
                types[row][col] = this.matrix[row][col].type;
            };
        };
        console.table(types);
    },

    _col: function(col) {
        var types = [],
            rows = this.rows;

        for (var row = 0; row < rows; row++) {
            types.push(this.matrix[row][col].type);
        };
        console.log(types);
    },

    _row: function(row) {
        var types = [],
            cols = this.cols;

        for (var col = 0; col < cols; col++) {
            types.push(this.matrix[row][col].type);
        };
        console.log(types);
    }
};

DDP.init("#grid", {
    $time: "#time .value",
    $score: "#score"
});
DDP.build(true);

$("#btnStart").click(function() {
    $("#startLayer").hide();
    DDP.play(true);
    DDP.cleanOut();
});

$("#btnAgain").click(function() {
    $("#overLayer").hide();
    DDP.play();
});