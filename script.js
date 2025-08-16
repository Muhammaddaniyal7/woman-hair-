class BrushRevealEffect {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.baseImage = null;
        this.imageContainer = null;
        this.instructionOverlay = null;

        this.isDrawing = false;
        this.hasInteracted = false;
        this.pixelRatio = window.devicePixelRatio || 1;

        // Brush settings
        this.brushSize = 50;
        this.brushSoftness = 0.7;
        this.lastPoint = { x: 0, y: 0 };

        // Animation smoothing
        this.points = [];
        this.maxPoints = 10;

        this.init();
    }

    init() {
        this.setupElements();
        this.setupCanvas();
        this.setupEventListeners();
        this.createWhiteOverlay();

        if (window.innerWidth > 768) {
            this.positionInitialCursor();
        }
    }

    setupElements() {
        this.canvas = document.getElementById('brushCanvas');
        this.baseImage = document.getElementById('baseImage');
        this.imageContainer = document.getElementById('imageContainer');
        this.instructionOverlay = document.getElementById('instructionOverlay');
        this.ctx = this.canvas.getContext('2d');
    }

    setupCanvas() {
        const updateCanvasSize = () => {
            const rect = this.baseImage.getBoundingClientRect();
            this.canvas.style.width = rect.width + 'px';
            this.canvas.style.height = rect.height + 'px';
            this.canvas.width = rect.width * this.pixelRatio;
            this.canvas.height = rect.height * this.pixelRatio;
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.scale(this.pixelRatio, this.pixelRatio);

            this.adjustBrushSize();
            this.createWhiteOverlay();
        };

        // Force update after image loads
        if (this.baseImage.complete && this.baseImage.naturalWidth > 0) {
            updateCanvasSize();
            this.imageContainer.classList.add('loaded');
        } else {
            this.baseImage.addEventListener('load', () => {
                updateCanvasSize();
                this.imageContainer.classList.add('loaded');
            });
        }

        window.addEventListener('resize', updateCanvasSize);
    }

    createWhiteOverlay() {
        if (!this.canvas.width || !this.canvas.height) return;
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width / this.pixelRatio, this.canvas.height / this.pixelRatio);
        this.ctx.globalCompositeOperation = 'destination-out';
    }

    setupEventListeners() {
        // Mouse
        this.canvas.addEventListener('mousedown', e => this.handleStart(e));
        this.canvas.addEventListener('mousemove', e => this.handleMove(e));
        this.canvas.addEventListener('mouseup', e => this.handleEnd(e));
        this.canvas.addEventListener('mouseleave', e => this.handleEnd(e));

        // Touch
        this.canvas.addEventListener('touchstart', e => this.handleStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', e => this.handleMove(e), { passive: false });
        this.canvas.addEventListener('touchend', e => this.handleEnd(e));
        this.canvas.addEventListener('touchcancel', e => this.handleEnd(e));
    }

    getEventPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        if (e.touches && e.touches.length) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    handleStart(e) {
        e.preventDefault();
        if (!this.hasInteracted) {
            this.hideInstructions();
            this.hasInteracted = true;
        }
        this.isDrawing = true;
        const pos = this.getEventPos(e);
        this.lastPoint = pos;
        this.points = [pos];
        this.drawBrush(pos.x, pos.y, 0);
    }

    handleMove(e) {
        e.preventDefault();
        if (!this.isDrawing) return;
        const pos = this.getEventPos(e);
        this.points.push(pos);
        if (this.points.length > this.maxPoints) this.points.shift();
        const velocity = this.calculateVelocity(this.lastPoint, pos);
        this.drawSmoothLine(this.lastPoint, pos, velocity);
        this.lastPoint = pos;
    }

    handleEnd(e) {
        e.preventDefault();
        this.isDrawing = false;
        this.points = [];
    }

    calculateVelocity(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.min(Math.sqrt(dx * dx + dy * dy) * 0.05, 1);
    }

    drawSmoothLine(from, to, velocity) {
        const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = from.x + (to.x - from.x) * t;
            const y = from.y + (to.y - from.y) * t;
            this.drawBrush(x, y, velocity);
        }
    }

    drawBrush(x, y, velocity) {
        const size = this.brushSize * (0.5 + velocity * 0.5);
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, `rgba(0, 0, 0, ${this.brushSoftness})`);
        gradient.addColorStop(0.7, `rgba(0, 0, 0, ${this.brushSoftness * 0.5})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fill();
    }

    hideInstructions() {
        if (this.instructionOverlay) {
            this.instructionOverlay.classList.add('hidden');
        }
    }

    positionInitialCursor() {
        setTimeout(() => {
            const rect = this.canvas.getBoundingClientRect();
            const fakeEvent = new MouseEvent('mousemove', {
                clientX: rect.left + rect.width * 0.5,
                clientY: rect.top + rect.height * 0.35,
                bubbles: true
            });
            document.dispatchEvent(fakeEvent);
        }, 100);
    }

    adjustBrushSize() {
        const base = window.innerWidth > 768 ? 50 : 30;
        this.brushSize = base * (this.canvas.width / (800 * this.pixelRatio));
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    new BrushRevealEffect();
});

// Reload on orientation change (mobile)
window.addEventListener('orientationchange', () => {
    setTimeout(() => location.reload(), 100);
});
