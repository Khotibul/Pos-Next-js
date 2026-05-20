type CodeSet = "B" | "C";

// Code 128 patterns for values 0..106.
// Each pattern is a string of digits representing module widths (bar/space alternating).
// Stop pattern (106) has 7 digits (13 modules); others have 6 digits (11 modules).
const PATTERNS: string[] = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213",
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132",
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211",
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313",
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331",
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111",
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214",
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "413111",
  "241112",
  "134111",
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141",
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141",
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "2331112", // 106 STOP
];

const START_B = 104;
const START_C = 105;
const STOP = 106;

function isDigits(value: string) {
  return /^[0-9]+$/.test(value);
}

function chooseCodeSet(value: string): CodeSet {
  // Prefer Code Set C for numeric strings with even length (>= 4).
  if (value.length >= 4 && value.length % 2 === 0 && isDigits(value)) return "C";
  return "B";
}

function encodeToCodes(value: string, set: CodeSet): number[] {
  if (set === "C") {
    if (!isDigits(value) || value.length % 2 !== 0) throw new Error("Invalid Code 128C input.");
    const codes: number[] = [START_C];
    for (let i = 0; i < value.length; i += 2) {
      codes.push(Number(value.slice(i, i + 2)));
    }
    return codes;
  }

  // Code Set B supports ASCII 32..127. We will clamp to that range by replacing unsupported chars with "?".
  const codes: number[] = [START_B];
  for (const ch of value) {
    const codePoint = ch.codePointAt(0) ?? 63;
    const normalized = codePoint >= 32 && codePoint <= 127 ? codePoint : 63; // "?"
    codes.push(normalized - 32);
  }
  return codes;
}

function checksum(codes: number[]) {
  // codes includes start code at index 0.
  let sum = codes[0] ?? 0;
  for (let i = 1; i < codes.length; i++) {
    sum += (codes[i] ?? 0) * i;
  }
  return sum % 103;
}

function buildModules(codes: number[]): number[] {
  // Convert codes to a flat list of module widths (bar/space alternating).
  const chk = checksum(codes);
  const full = [...codes, chk, STOP];
  const modules: number[] = [];
  for (const c of full) {
    const pattern = PATTERNS[c];
    if (!pattern) throw new Error(`Invalid Code 128 value: ${c}`);
    for (const digit of pattern) modules.push(Number(digit));
  }
  return modules;
}

export type Code128Svg = {
  width: number;
  height: number;
  rects: Array<{ x: number; w: number }>;
};

export function code128Svg(valueRaw: string, opts?: { height?: number; moduleWidth?: number; quietZone?: number }): Code128Svg {
  const value = (valueRaw ?? "").trim();
  if (!value) return { width: 0, height: opts?.height ?? 44, rects: [] };

  const height = opts?.height ?? 44;
  const moduleWidth = opts?.moduleWidth ?? 2;
  const quietZone = opts?.quietZone ?? 10;

  const set = chooseCodeSet(value);
  const codes = encodeToCodes(value, set);
  const modules = buildModules(codes);

  // modules alternate bar/space. Start with bar.
  let x = quietZone;
  const rects: Array<{ x: number; w: number }> = [];
  for (let i = 0; i < modules.length; i++) {
    const w = (modules[i] ?? 0) * moduleWidth;
    if (i % 2 === 0 && w > 0) rects.push({ x, w });
    x += w;
  }
  const width = x + quietZone;
  return { width, height, rects };
}

