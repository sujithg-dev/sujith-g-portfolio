let animationId = null;

function circuitBackground() {
    const canvas = document.getElementsByClassName('circuit-background')[0];
    const ctx = canvas.getContext('2d');

    const CFG = {
        gridX: 20,
        gridY: 10,
        nodeRadius: 0.5,
        dotCount: 40,
        dotBaseSpeed: 0.001,
        dotRadius: 0.15,
        glowBlur: 0,
    };

    function updateGridForDevice() {
        if (window.innerWidth < 768) { // Mobile
            CFG.gridX = 10;
            CFG.gridY = 18;
        } else if (window.innerWidth < 1024) { // Tablet
            CFG.gridX = 18;
            CFG.gridY = 14;
        } else {  // Desktop
            CFG.gridX = 20;
            CFG.gridY = 10;
        }
    }

    let W, H, cellW, cellH, nodes, edges, paths;

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;

        cellW = W / (CFG.gridX - 1);
        cellH = H / (CFG.gridY - 1);

        updateGridForDevice();
        buildCircuit();
    }

    function buildCircuit() {
        nodes = [];

        for (let r = 0; r < CFG.gridY; r++) {
            for (let c = 0; c < CFG.gridX; c++) {
                const jitter = (Math.random() - .5) * cellW * .0;

                nodes.push({
                    x: c * cellW + jitter,
                    y: r * cellH + (Math.random() - .5) * cellH * .0,
                    row: r, col: c,
                });
            }
        }

        edges = [];
        const idx = (r, c) => r * CFG.gridX + c;

        for (let r = 0; r < CFG.gridY; r++) {
            for (let c = 0; c < CFG.gridX; c++) {
                if (c + 1 < CFG.gridX && Math.random() > .20)
                    edges.push([idx(r, c), idx(r, c + 1)]);

                if (r + 1 < CFG.gridY && Math.random() > .10)
                    edges.push([idx(r, c), idx(r + 1, c)]);

                if (c + 1 < CFG.gridX && r + 1 < CFG.gridY && Math.random() > .40) {
                    if (Math.random() > .5)
                        edges.push([idx(r, c), idx(r + 1, c + 1)]);
                    else
                        edges.push([idx(r, c + 1), idx(r + 1, c)]);
                }
            }
        }

        buildPaths();
        initDots();
    }

    function buildPaths() {
        const adj = Array.from({ length: nodes.length }, () => []);
        edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });

        paths = [];
        const minLen = 6, maxLen = 22;

        for (let i = 0; i < 90; i++) {
            const start = Math.floor(Math.random() * nodes.length);
            const path = [start];
            const visited = new Set([start]);
            let cur = start;
            const len = minLen + Math.floor(Math.random() * (maxLen - minLen));

            while (path.length < len) {
                const neighbors = adj[cur].filter(n => !visited.has(n));

                if (!neighbors.length)
                    break;

                cur = neighbors[Math.floor(Math.random() * neighbors.length)];
                visited.add(cur);
                path.push(cur);
            }

            if (path.length >= minLen)
                paths.push(path);
        }
    }

    let dots = [];

    function initDots() {
        dots = Array.from({ length: CFG.dotCount }, () => spawnDot());
    }

    function spawnDot() {
        const pathIdx = Math.floor(Math.random() * paths.length);
        const color = getComputedStyle(document.documentElement).getPropertyValue('--dot').trim();
        const speed = CFG.dotBaseSpeed * (.6 + Math.random() * 1.2);

        return {
            pathIdx,
            t: Math.random(),
            speed,
            color: color,
            radius: CFG.dotRadius * (.7 + Math.random() * .7),
            trail: [],
        };
    }

    function pathPos(path, t) {
        if (path.length < 2)
            return nodes[path[0]];

        const total = path.length - 1;
        const scaled = t * total;
        const seg = Math.min(Math.floor(scaled), total - 1);
        const frac = scaled - seg;
        const a = nodes[path[seg]];
        const b = nodes[path[seg + 1]];

        return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
    }

    function draw(ts) {
        ctx.clearRect(0, 0, W, H);

        const lineColor = getComputedStyle(document.documentElement).getPropertyValue('--line').trim();
        const nodeColor = getComputedStyle(document.documentElement).getPropertyValue('--node').trim();

        ctx.lineWidth = 1;

        edges.forEach(([a, b]) => {
            const na = nodes[a], nb = nodes[b];
            ctx.strokeStyle = lineColor;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(na.x, na.y);
            ctx.lineTo(nb.x, nb.y);
            ctx.stroke();
        });

        nodes.forEach(n => {
            ctx.shadowBlur = 10;
            ctx.shadowColor = nodeColor;
            ctx.fillStyle = nodeColor;
            ctx.beginPath();
            ctx.arc(n.x, n.y, CFG.nodeRadius, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.shadowBlur = 0;

        dots.forEach(dot => {
            dot.t += dot.speed;
            if (dot.t >= 1) {
                Object.assign(dot, spawnDot());
                return;
            }

            const path = paths[dot.pathIdx];
            const pos = pathPos(path, dot.t);

            dot.trail.push({ ...pos });
            if (dot.trail.length > 35) dot.trail.shift();

            dot.trail.forEach((p, i) => {
                const alpha = (i / dot.trail.length) * 5;
                const r = dot.radius * (i / dot.trail.length) * 5;
                ctx.shadowBlur = CFG.glowBlur * 0;
                ctx.shadowColor = dot.color;
                ctx.fillStyle = dot.color.replace(')', `,${alpha})`).replace('rgb', 'rgba').replace('##', '#');
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(.5, r), 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;

            ctx.shadowBlur = CFG.glowBlur;
            ctx.shadowColor = dot.color;
            ctx.fillStyle = dot.color;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, dot.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = CFG.glowBlur * 0;
            ctx.shadowColor = dot.color;
            ctx.strokeStyle = dot.color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, dot.radius + 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.shadowBlur = 0;
        });

        animationId = requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    resize();
    animationId = requestAnimationFrame(draw);
}

function stopCircuit() {
    cancelAnimationFrame(animationId);
    animationId = null;
    ctx.clearRect(0, 0, W, H);
}