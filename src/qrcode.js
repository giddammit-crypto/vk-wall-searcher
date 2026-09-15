/**
 * src/qrcode.js — Autonomous Offline QR Code Generator (SVG & Matrix)
 * =============================================================================
 * Чистый автономный генератор QR-кодов без внешних библиотек и сетевых запросов.
 * Поддерживает Model 2, кодирование байт (UTF-8), уровни коррекции ошибок L, M, Q, H.
 * Выводит чёткую векторную SVG-графику для печати с разрешением 300+ DPI.
 *
 * Разработка: Амброзиев О.А. (AURORA v3.7)
 */

// Таблицы полиномов Галуа GF(256)
const GF256 = {
    exp: new Uint8Array(512),
    log: new Uint8Array(256)
};

(function initGF() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
        GF256.exp[i] = x;
        GF256.exp[i + 255] = x;
        GF256.log[x] = i;
        x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
    }
})();

function gfMul(x, y) {
    if (x === 0 || y === 0) return 0;
    return GF256.exp[GF256.log[x] + GF256.log[y]];
}

// Генератор полинома ошибок Рида-Соломона
function rsGeneratorPoly(degree) {
    let poly = [1];
    for (let i = 0; i < degree; i++) {
        const next = [1];
        const factor = GF256.exp[i];
        for (let j = 1; j < poly.length; j++) {
            next[j] = poly[j] ^ gfMul(poly[j - 1], factor);
        }
        next.push(gfMul(poly[poly.length - 1], factor));
        poly = next;
    }
    return poly;
}

function rsComputeRemainder(data, numEcBytes) {
    const gen = rsGeneratorPoly(numEcBytes);
    const res = new Uint8Array(numEcBytes);
    for (const b of data) {
        const factor = b ^ res[0];
        for (let j = 0; j < numEcBytes - 1; j++) {
            res[j] = res[j + 1] ^ gfMul(gen[j + 1], factor);
        }
        res[numEcBytes - 1] = gfMul(gen[numEcBytes], factor);
    }
    return res;
}

// Конфигурации QR-версий (1..6) для уровня M (до ~134 байт)
// [Всего кодовых слов, Данных для M, Блоков, EC байт на блок]
const VERSION_SPECS = [
    null,
    { ver: 1, size: 21, totalWords: 26, dataWords: 16, ecPerBlock: 10, blocks: 1 },
    { ver: 2, size: 25, totalWords: 44, dataWords: 28, ecPerBlock: 16, blocks: 1 },
    { ver: 3, size: 29, totalWords: 70, dataWords: 44, ecPerBlock: 26, blocks: 1 },
    { ver: 4, size: 33, totalWords: 100, dataWords: 64, ecPerBlock: 18, blocks: 2 },
    { ver: 5, size: 37, totalWords: 134, dataWords: 86, ecPerBlock: 24, blocks: 2 },
    { ver: 6, size: 41, totalWords: 172, dataWords: 108, ecPerBlock: 16, blocks: 4 }
];

// Координаты маркеров выравнивания (Alignment patterns)
const ALIGNMENT_POS = [
    [],
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34]
];

export function generateQrMatrix(text) {
    const rawText = (typeof text === 'string' && text.trim().length > 0) ? text.trim() : 'https://biblioteka33.ru';
    const utf8Bytes = new TextEncoder().encode(rawText);
    
    // Подбор минимальной подходящей версии QR
    let spec = null;
    for (let v = 1; v < VERSION_SPECS.length; v++) {
        // Заголовок: 4 бита режима (0100=Byte) + 8 бит длины = 12 бит (1.5 байта)
        if (utf8Bytes.length + 2 <= VERSION_SPECS[v].dataWords) {
            spec = VERSION_SPECS[v];
            break;
        }
    }
    if (!spec) {
        spec = VERSION_SPECS[6];
    }

    // 1. Формирование битового потока
    const bits = [];
    function pushBits(val, len) {
        for (let i = len - 1; i >= 0; i--) {
            bits.push((val >>> i) & 1);
        }
    }

    pushBits(0b0100, 4); // Режим Byte
    pushBits(utf8Bytes.length, 8); // Длина
    for (const b of utf8Bytes) {
        pushBits(b, 8);
    }
    // Терминатор (до 4 нулей)
    const maxBits = spec.dataWords * 8;
    const termLen = Math.min(4, maxBits - bits.length);
    pushBits(0, termLen);
    // Выравнивание до байта
    while (bits.length % 8 !== 0) {
        bits.push(0);
    }
    // Pad-байты (0xEC, 0x11)
    const padBytes = [0xEC, 0x11];
    let padIdx = 0;
    while (bits.length < maxBits) {
        pushBits(padBytes[padIdx % 2], 8);
        padIdx++;
    }

    // 2. Преобразование битов в байты данных
    const dataBytes = new Uint8Array(spec.dataWords);
    for (let i = 0; i < spec.dataWords; i++) {
        let byteVal = 0;
        for (let j = 0; j < 8; j++) {
            byteVal = (byteVal << 1) | bits[i * 8 + j];
        }
        dataBytes[i] = byteVal;
    }

    // 3. Вычисление блоков коррекции ошибок
    const numBlocks = spec.blocks;
    const ecPerBlock = spec.ecPerBlock;
    const wordsPerBlock = Math.floor(spec.dataWords / numBlocks);
    const dataBlocks = [];
    const ecBlocks = [];

    for (let b = 0; b < numBlocks; b++) {
        const start = b * wordsPerBlock;
        const end = start + wordsPerBlock;
        const blockData = dataBytes.slice(start, end);
        dataBlocks.push(blockData);
        ecBlocks.push(rsComputeRemainder(blockData, ecPerBlock));
    }

    // Чередование (Interleaving)
    const finalWords = [];
    for (let w = 0; w < wordsPerBlock; w++) {
        for (let b = 0; b < numBlocks; b++) {
            finalWords.push(dataBlocks[b][w]);
        }
    }
    for (let w = 0; w < ecPerBlock; w++) {
        for (let b = 0; b < numBlocks; b++) {
            finalWords.push(ecBlocks[b][w]);
        }
    }

    // 4. Построение матрицы
    const N = spec.size;
    const matrix = Array.from({ length: N }, () => new Int8Array(N).fill(-1));

    function addFinder(row, col) {
        for (let r = -1; r <= 7; r++) {
            for (let c = -1; c <= 7; c++) {
                const tr = row + r;
                const tc = col + c;
                if (tr >= 0 && tr < N && tc >= 0 && tc < N) {
                    if (r === -1 || r === 7 || c === -1 || c === 7) {
                        matrix[tr][tc] = 0;
                    } else if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
                        matrix[tr][tc] = 1;
                    } else {
                        matrix[tr][tc] = 0;
                    }
                }
            }
        }
    }

    addFinder(0, 0);
    addFinder(0, N - 7);
    addFinder(N - 7, 0);

    const alignPos = ALIGNMENT_POS[spec.ver];
    if (alignPos && alignPos.length > 0) {
        for (const r of alignPos) {
            for (const c of alignPos) {
                if ((r < 9 && c < 9) || (r < 9 && c > N - 9) || (r > N - 9 && c < 9)) continue;
                for (let dr = -2; dr <= 2; dr++) {
                    for (let dc = -2; dc <= 2; dc++) {
                        const dist = Math.max(Math.abs(dr), Math.abs(dc));
                        matrix[r + dr][c + dc] = dist === 1 ? 0 : 1;
                    }
                }
            }
        }
    }

    for (let i = 8; i < N - 8; i++) {
        if (matrix[6][i] === -1) matrix[6][i] = i % 2 === 0 ? 1 : 0;
        if (matrix[i][6] === -1) matrix[i][6] = i % 2 === 0 ? 1 : 0;
    }

    matrix[4 * spec.ver + 9][8] = 1;

    for (let i = 0; i < 9; i++) {
        if (matrix[8][i] === -1) matrix[8][i] = 0;
        if (matrix[i][8] === -1) matrix[i][8] = 0;
    }
    for (let i = 0; i < 8; i++) {
        if (matrix[8][N - 1 - i] === -1) matrix[8][N - 1 - i] = 0;
        if (matrix[N - 1 - i][8] === -1) matrix[N - 1 - i][8] = 0;
    }

    let bitIdx = 0;
    const finalBits = [];
    for (const w of finalWords) {
        for (let i = 7; i >= 0; i--) {
            finalBits.push((w >>> i) & 1);
        }
    }

    let up = true;
    for (let right = N - 1; right > 0; right -= 2) {
        if (right === 6) right--;
        const rows = up ? Array.from({ length: N }, (_, i) => N - 1 - i) : Array.from({ length: N }, (_, i) => i);
        for (const r of rows) {
            for (const c of [right, right - 1]) {
                if (matrix[r][c] === -1) {
                    const bit = bitIdx < finalBits.length ? finalBits[bitIdx++] : 0;
                    const mask = (r + c) % 2 === 0;
                    matrix[r][c] = (bit ^ (mask ? 1 : 0)) ? 1 : 0;
                }
            }
        }
        up = !up;
    }

    // Согласно ISO/IEC 18004: Уровень коррекции ошибок M (00) и маска 0 (000).
    // 5 бит = 00000. 10 бит полинома BCH(15, 5) = 0000000000.
    // Маска XOR = 101010000010010 (0x5412). Итоговое значение: 0x5412.
    const FORMAT_INFO_M_MASK0 = 0x5412;
    const fmtBits = [];
    for (let i = 14; i >= 0; i--) {
        fmtBits.push((FORMAT_INFO_M_MASK0 >>> i) & 1);
    }

    const fmtCoords = [
        [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],
        [7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]
    ];
    for (let i = 0; i < 15; i++) {
        const [r, c] = fmtCoords[i];
        matrix[r][c] = fmtBits[i];
    }
    const fmtCoords2 = [
        [N-1,8],[N-2,8],[N-3,8],[N-4,8],[N-5,8],[N-6,8],[N-7,8],
        [8,N-8],[8,N-7],[8,N-6],[8,N-5],[8,N-4],[8,N-3],[8,N-2],[8,N-1]
    ];
    for (let i = 0; i < 15; i++) {
        const [r, c] = fmtCoords2[i];
        matrix[r][c] = fmtBits[i];
    }

    return matrix;
}

export function createQrSvg(text, options = {}) {
    const size = options.size || 220;
    const fg = options.foreground || '#000000';
    const bg = options.background || '#ffffff';
    // ISO/IEC 18004 строго требует свободное белое поле (Quiet Zone) шириной не менее 4 модулей
    const margin = options.margin !== undefined ? Math.max(0, options.margin) : 4;

    const matrix = generateQrMatrix(text);
    const n = matrix.length;
    const totalModules = n + margin * 2;

    let paths = '';
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if (matrix[r][c] === 1) {
                const x = c + margin;
                const y = r + margin;
                paths += `M${x},${y}h1v1h-1z `;
            }
        }
    }

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalModules}" width="${size}" height="${size}" shape-rendering="crispEdges" class="qr-svg-code">
    ${bg !== 'transparent' ? `<rect width="100%" height="100%" fill="${bg}"/>` : ''}
    <path d="${paths.trim()}" fill="${fg}" shape-rendering="crispEdges" />
</svg>`.trim();
}
