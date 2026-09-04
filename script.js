// state management
const state = {
    activePresetKey: 'tangerine-classic',
    aspect: '1:1',
    isFlipped: false,
    width: 1000,
    height: 1000,
    noiseEnabled: true,
    noiseIntensity: 55, // 1 - 100
    exportScale: 2
};

// helper function to get currently selected gradient preset
function getCurrentPreset() {
    return GRADIENT_PRESETS[state.activePresetKey] || GRADIENT_PRESETS['tangerine-classic'];
}

// DOM elements
const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
const aspectBtns = document.querySelectorAll('.btn-aspect');
const btnAspectFlip = document.getElementById('btn-aspect-flip');
const customContainer = document.getElementById('custom-aspect-container');
const inputCustomW = document.getElementById('custom-w');
const inputCustomH = document.getElementById('custom-h');
const toggleNoise = document.getElementById('toggle-noise');
const sliderNoise = document.getElementById('noise-intensity');
const noiseValText = document.getElementById('noise-val');
const noiseSliderContainer = document.getElementById('noise-slider-container');
const btnExportPNG = document.getElementById('btn-export-png');
const btnCopyCSS = document.getElementById('btn-copy-css');
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const toast = document.getElementById('toast');

// initialize
function init() {
    updateCanvasDimensions();
    render();
    setupEvents();
}

// define allowlist for maximum/minimum resolution and scale
const LIMITS = {
    MIN_DIM: 100,
    MAX_DIM: 4096,         //sSafe max canvas size
    MAX_TOTAL_PIXELS: 4096 * 4096, // rendering performance limit
    ALLOWED_SCALES: [1, 2, 4]
};

function clampDimension(val, fallback = 1000) {
    const num = parseInt(val, 10);
    if (isNaN(num)) return fallback;
    return Math.max(LIMITS.MIN_DIM, Math.min(LIMITS.MAX_DIM, num));
}

// calculate resolution based on aspect ratio
function updateCanvasDimensions() {
    const baseDim = 1000;

    if (state.aspect === '1:1') {
        state.width = baseDim;
        state.height = baseDim;
    } else if (state.aspect === '4:3') {
        const ratio = state.isFlipped ? (3 / 4) : (4 / 3);
        state.width = baseDim * ratio;
        state.height = baseDim;
    } else if (state.aspect === '16:9') {
        const ratio = state.isFlipped ? (9 / 16) : (16 / 9);
        state.width = baseDim * ratio;
        state.height = baseDim;
    } else if (state.aspect === 'custom') {
        state.width = clampDimension(inputCustomW.value, baseDim);
        state.height = clampDimension(inputCustomH.value, baseDim);
    }

    canvas.width = Math.round(state.width);
    canvas.height = Math.round(state.height);

    const wrapper = document.getElementById('canvas-wrapper');
    if (wrapper) {
        wrapper.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
    }
}

// main drawing process
function render(targetCtx = ctx, w = canvas.width, h = canvas.height, withNoise = state.noiseEnabled) {
    const preset = getCurrentPreset();

    // 1. base
    targetCtx.fillStyle = preset.base;
    targetCtx.fillRect(0, 0, w, h);

    // 2. synthesize smooth gradient
    targetCtx.save();
    targetCtx.globalCompositeOperation = 'source-over';

    targetCtx.scale(w, h);

    preset.points.forEach(pt => {
        const grad = targetCtx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.r);
        grad.addColorStop(0, pt.color);
        grad.addColorStop(0.5, hexToRgba(pt.color, 0.7));
        grad.addColorStop(1, hexToRgba(pt.color, 0));

        targetCtx.fillStyle = grad;
        targetCtx.fillRect(0, 0, 1, 1);
    });

    targetCtx.restore();

    // 3. apply film grain
    if (withNoise) {
        applyNoise(targetCtx, w, h, state.noiseIntensity);
    }
}

// generate & synthesize film grain
function applyNoise(context, w, h, intensity) {
    const imgData = context.getImageData(0, 0, w, h);
    const data = imgData.data;
    const factor = (intensity / 100) * 128;

    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * factor;
        data[i] = clamp(data[i] + noise);
        data[i + 1] = clamp(data[i + 1] + noise * 0.9);
        data[i + 2] = clamp(data[i + 2] + noise * 0.8);
    }
    context.putImageData(imgData, 0, 0);
}

function clamp(v) {
    return v < 0 ? 0 : v > 255 ? 255 : v;
}

// function to check color code format
function isValidHexColor(color) {
    return /^#([0-9a-fA-F]{3}){1,2}$/.test(color);
}

function hexToRgba(hex, alpha) {
    if (!isValidHexColor(hex)) {
        return `rgba(0, 0, 0, ${alpha})`; // fallback if the value is invalid
    }
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// event listener
function setupEvents() {
    // change aspect ratio
    aspectBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            aspectBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.aspect = btn.dataset.ratio;

            if (state.aspect === 'custom') {
                customContainer.style.display = 'flex';
            } else {
                customContainer.style.display = 'none';
            }
            updateCanvasDimensions();
            render();
        });
    });

    // click event of invert button
    btnAspectFlip.addEventListener('click', () => {
        state.isFlipped = !state.isFlipped;
        btnAspectFlip.classList.toggle('active', state.isFlipped);

        // if "optional" is selected, change the width and height of the input box
        if (state.aspect === 'custom') {
            const tempW = inputCustomW.value;
            inputCustomW.value = inputCustomH.value;
            inputCustomH.value = tempW;
        }

        updateCanvasDimensions();
        render();
    });

    // input custom size
    [inputCustomW, inputCustomH].forEach(input => {
        input.addEventListener('input', () => {
            if (state.aspect === 'custom') {
                updateCanvasDimensions();
                render();
            }
        });
    });

    // noise ON/OFF
    toggleNoise.addEventListener('change', (e) => {
        state.noiseEnabled = e.target.checked;
        noiseSliderContainer.style.opacity = state.noiseEnabled ? '1' : '0.4';
        noiseSliderContainer.style.pointerEvents = state.noiseEnabled ? 'auto' : 'none';
        render();
    });

    // noise intensity
    sliderNoise.addEventListener('input', (e) => {
        state.noiseIntensity = parseInt(e.target.value);
        noiseValText.textContent = `${state.noiseIntensity}%`;
        render();
    });

    // export PNG
    btnExportPNG.addEventListener('click', () => {
        const scaleInput = parseInt(document.getElementById('export-scale').value, 10);
        const scale = LIMITS.ALLOWED_SCALES.includes(scaleInput) ? scaleInput : 1;

        const exportW = Math.round(state.width * scale);
        const exportH = Math.round(state.height * scale);

        if (exportW * exportH > LIMITS.MAX_TOTAL_PIXELS) {
            alert('解像度が大きすぎるため書き出しできません。');
            return;
        }

        const offscreen = document.createElement('canvas');
        offscreen.width = exportW;
        offscreen.height = exportH;
        const offCtx = offscreen.getContext('2d');

        // high-resolution rendering
        render(offCtx, exportW, exportH, state.noiseEnabled);

        // download
        offscreen.toBlob((blob) => {
            if (!blob) {
                alert('画像の生成に失敗しました。');
                return;
            }
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `c3-tangerine-gradient_${exportW}x${exportH}.png`;
            link.href = url;
            link.click();
        
            // prevent memory leaks
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, 'image/png');
    });

    // generate and copy CSS code
    btnCopyCSS.addEventListener('click', () => {
        const cssCode = generateCSSCode();
        copyToClipboard(cssCode)
            .then(() => {
                showToast();
            })
            .catch(err => {
                console.error('コピー失敗:', err);
                alert('クリップボードへのコピーに失敗しました。');
            });
    });

    // switch theme
    btnThemeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
    });
}

// generate CSS / SVG filter code for web
function generateCSSCode() {
    const preset = getCurrentPreset();

    const gradientsCSS = [...preset.points]
        .reverse() 
        .map(pt => {
            const posX = Math.round(pt.x * 100);
            const posY = Math.round(pt.y * 100);
        const radius = Math.round(pt.r * 100);
            return `    radial-gradient(${radius}% ${radius}% at ${posX}% ${posY}%, ${pt.color} 0%, ${hexToRgba(pt.color, 0.7)} 50%, transparent 100%)`;
        })
        .join(',\n');

    if (!state.noiseEnabled) {
        return `/* CSS Mesh Gradient (${preset.name}) */
.mesh-bg {
    background-color: ${preset.base};
    background-image: 
${gradientsCSS};
}`;
    } else {
        return `/* Web用コード (グラデーション + ノイズSVGフィルター) */
.mesh-bg {
    background-color: ${preset.base};
    background-image: 
${gradientsCSS};
    position: relative;
}

/* ノイズレイヤー */
.mesh-bg::after {
    content: "";
    position: absolute;
    inset: 0;
    opacity: ${(state.noiseIntensity / 100).toFixed(2)};
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    pointer-events: none;
}`;
    }
}

function showToast() {
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// function to copy to clipboard
async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        return new Promise((resolve, reject) => {
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
                resolve();
            } else {
                reject(new Error('コピーの実行に失敗しました。'));
            }
        });
    }
}

// boot
window.addEventListener('DOMContentLoaded', init);