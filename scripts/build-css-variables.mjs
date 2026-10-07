#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';

const DEFAULTS = {
  tokens: 'design-tokens.tokens.json',
  out: 'styles/tokens.css',
  prefix: 'ds',
  colorFormat: 'hex',
};

const HELP = `
Convert a Figma Tokens Studio export into CSS custom properties.

  node scripts/build-css-variables.mjs [options]

Options
  --tokens <file>     Source token JSON        (default: ${DEFAULTS.tokens})
  --out <file>        Generated CSS           (default: ${DEFAULTS.out})
  --prefix <string>   Variable prefix          (default: ${DEFAULTS.prefix})
  --color-format <f>  hex | hex8               (default: ${DEFAULTS.colorFormat})
                      hex  -> #rrggbb, and rgb(r g b / a%) when alpha < 1
                      hex8 -> same, but a non-opaque color stays #rrggbbaa
  --stdout            Write CSS to stdout instead of --out
  --check             Do not write. Exit 1 if --out is missing or stale
  --strict            Treat warnings as failures
  --audit             Print a WCAG contrast report for the color roles
  --guard <dirs...>   Fail if UI code references a primitive (--${DEFAULTS.prefix}-ref-*)
  -h, --help          Show this help
`;

const ROLE_NAME_FIXES = new Map([
  ['on seconary', 'on secondary'],
  ['surface contaier low', 'surface container low'],
  ['on secondaary fixed variant', 'on secondary fixed variant'],
]);

const KNOWN_ROLE_NAMES = new Set([
  'primary', 'on primary', 'primary container', 'on primary container',
  'secondary', 'on secondary', 'secondary container', 'on secondary container',
  'tertiary', 'on tertiary', 'tertiary container', 'on tertiary container',
  'error', 'on error', 'error container', 'on error container',
  'surface', 'on surface', 'surface variant', 'on surface variant',
  'surface dim', 'surface bright', 'surface tint', 'surface tint color',
  'surface container lowest', 'surface container low', 'surface container',
  'surface container high', 'surface container highest',
  'background', 'on background',
  'inverse surface', 'inverse on surface', 'inverse primary',
  'outline', 'outline variant', 'scrim', 'shadow',
  'primary fixed', 'on primary fixed', 'primary fixed dim', 'on primary fixed variant',
  'secondary fixed', 'on secondary fixed', 'secondary fixed dim', 'on secondary fixed variant',
  'tertiary fixed', 'on tertiary fixed', 'tertiary fixed dim', 'on tertiary fixed variant',
  'success', 'on success', 'success container', 'on success container',
  'warning', 'on warning', 'warning container', 'on warning container',
  'info', 'on info', 'info container', 'on info container',
]);

const ROLE_FAMILIES = ['primary', 'secondary', 'tertiary', 'error', 'success', 'warning', 'info'];

const TYPOGRAPHY_SUBPROPERTIES = new Map([
  ['fontSize', 'font-size'],
  ['lineHeight', 'line-height'],
  ['fontWeight', 'font-weight'],
  ['fontFamily', 'font-family'],
  ['letterSpacing', 'letter-spacing'],
  ['fontStyle', 'font-style'],
  ['fontStretch', 'font-stretch'],
  ['textDecoration', 'text-decoration'],
  ['paragraphIndent', 'text-indent'],
  ['paragraphSpacing', 'paragraph-spacing'],
]);

const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.vercel']);

function parseArgs(argv) {
  const options = { ...DEFAULTS, flags: new Set(), guard: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value === undefined) throw new Error(`Missing value for ${arg}`);
      i += 1;
      return value;
    };
    switch (arg) {
      case '-h':
      case '--help':
        options.flags.add('help');
        break;
      case '--stdout':
        options.flags.add('stdout');
        break;
      case '--check':
        options.flags.add('check');
        break;
      case '--strict':
        options.flags.add('strict');
        break;
      case '--audit':
        options.flags.add('audit');
        break;
      case '--guard':
        options.flags.add('guard');
        while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
          options.guard.push(next());
        }
        break;
      case '--tokens':
        options.tokens = next();
        break;
      case '--out':
        options.out = next();
        break;
      case '--prefix':
        options.prefix = next();
        break;
      case '--color-format':
        options.colorFormat = next();
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }
  if (!['hex', 'hex8'].includes(options.colorFormat)) {
    throw new Error(`--color-format must be "hex" or "hex8"`);
  }
  return options;
}

const rawValue = (node) => (node.$value !== undefined ? node.$value : node.value);
const rawType = (node) => node.$type ?? node.type ?? null;
const dot = (segments) => segments.join('.');
const isTokenNode = (node) => Boolean(node) && typeof node === 'object' && !Array.isArray(node)
  && ('value' in node || '$value' in node);

const COMPOSITE_TYPES = new Set(['typography', 'shadow', 'boxShadow', 'border', 'strokeStyle', 'transition', 'gradient']);

function isCompositeNode(node, segments) {
  const declared = rawType(node);
  if (declared && COMPOSITE_TYPES.has(declared)) return true;
  if (segments.length === 2 && segments[0] === 'typography') {
    const children = Object.values(node).filter((value) => value && typeof value === 'object');
    return children.length > 0 && children.every(isTokenNode);
  }
  return false;
}

function flatten(node, segments, out) {
  if (isTokenNode(node)) {
    out.push({ path: segments, key: dot(segments), value: rawValue(node), type: rawType(node) });
    return;
  }
  if (!node || typeof node !== 'object') return;
  if (isCompositeNode(node, segments)) {
    out.push({ path: segments, key: dot(segments), value: node, type: rawType(node) ?? 'typography' });
    return;
  }
  for (const name of Object.keys(node)) flatten(node[name], [...segments, name], out);
}

function slug(input) {
  return String(input)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function digitsSplit(input) {
  const match = /^(\D*)(\d+)$/.exec(input);
  if (!match) return input;
  return match[1] ? `${match[1]}-${match[2]}` : match[2];
}

function tight(input) {
  return String(input).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseColor(value) {
  const hex = String(value).trim().replace(/^#/, '');
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: 255 };
  }
  if (/^[0-9a-f]{8}$/i.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: parseInt(hex.slice(6, 8), 16),
    };
  }
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)\s*(?:[,/]\s*([\d.%]+)\s*)?\)$/i.exec(String(value).trim());
  if (!rgb) return null;
  const alpha = rgb[4] === undefined
    ? 1
    : String(rgb[4]).endsWith('%') ? parseFloat(rgb[4]) / 100 : parseFloat(rgb[4]);
  return {
    r: Math.round(Number(rgb[1])),
    g: Math.round(Number(rgb[2])),
    b: Math.round(Number(rgb[3])),
    a: Math.round(alpha * 255),
  };
}

function formatColor(value, colorFormat) {
  const color = parseColor(value);
  if (!color) return null;
  const hex = (n) => n.toString(16).padStart(2, '0');
  const rgbHex = hex(color.r) + hex(color.g) + hex(color.b);
  if (color.a === 255) return `#${rgbHex}`;
  if (colorFormat === 'hex8') return `#${rgbHex}${hex(color.a)}`;
  const alpha = Number(((color.a / 255) * 100).toFixed(2));
  return `rgb(${color.r} ${color.g} ${color.b} / ${alpha}%)`;
}

function formatDimension(value) {
  if (typeof value === 'string') return /[a-z%]/i.test(value) ? value : `${value}px`;
  return `${value}px`;
}

function shadowToCss(value, colorFormat) {
  const { shadowType, offsetX, offsetY, radius, spread, color } = value;
  const parts = [
    formatDimension(offsetX ?? 0),
    formatDimension(offsetY ?? 0),
    formatDimension(radius ?? 0),
    formatDimension(spread ?? 0),
    formatColor(color, colorFormat) ?? String(color),
  ];
  const fn = shadowType === 'innerShadow' ? 'inset ' : '';
  return `${fn}${parts.join(' ')}`;
}

function luminance(rgb) {
  const channel = (n) => {
    const s = n / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function varNameFor(entry, prefix, warnings, appliedFixes) {
  const [group, second, third, fourth] = entry.path;
  if (group === 'primitives' && second === 'color palettes' && third && fourth) {
    const palette = slug(third);
    const tightPalette = tight(third);
    const tightStep = tight(fourth);
    const step = tightStep.startsWith(tightPalette) ? tightStep.slice(tightPalette.length) : tight(fourth);
    return `--${prefix}-ref-${palette}${step ? `-${digitsSplit(slug(step))}` : ''}`;
  }
  if (group === 'primitives' && second === 'key colors' && third) {
    const name = third.replace(/\s*key color$/i, '').trim();
    return `--${prefix}-ref-key-${slug(name)}`;
  }
  if (group === 'primitives') {
    return `--${prefix}-ref-${entry.path.slice(1).map(slug).join('-')}`;
  }
  if (group === 'color roles' && second) {
    const fixed = ROLE_NAME_FIXES.get(second);
    if (fixed) appliedFixes.add(`"${second}" -> "${fixed}"`);
    const canonical = fixed ?? second;
    if (!KNOWN_ROLE_NAMES.has(canonical)) {
      warnings.push(`Unrecognized color role name "${second}"; emitted as-is`);
    }
    return `--${prefix}-color-${slug(canonical)}`;
  }
  if (group === 'effect') {
    return `--${prefix}-effect-${entry.path.slice(1).map(slug).join('-')}`;
  }
  if (group === 'typography' && second) {
    return `--${prefix}-text-${slug(second)}`;
  }
  return `--${prefix}-${entry.path.map(slug).join('-')}`;
}

function build(options) {
  const warnings = [];
  const appliedFixes = new Set();
  const source = JSON.parse(readFileSync(options.tokens, 'utf8'));

  const entries = [];
  flatten(source, [], entries);

  const byKey = new Map(entries.map((entry) => [entry.key, entry]));
  const varNameByKey = new Map();
  for (const entry of entries) {
    varNameByKey.set(entry.key, varNameFor(entry, options.prefix, warnings, appliedFixes));
  }

  const refPattern = /\{([^{}]+)\}/g;
  const hasRef = (value) => typeof value === 'string' && /\{[^{}]+\}/.test(value);
  const singleRef = (value) => {
    if (typeof value !== 'string') return null;
    const match = /^\{([^{}]+)\}$/.exec(value.trim());
    return match ? match[1].trim() : null;
  };

  const resolveLiteral = (entry, stack = []) => {
    if (stack.includes(entry.key)) throw new Error(`Reference cycle: ${[...stack, entry.key].join(' -> ')}`);
    const value = entry.value;
    if (hasRef(value)) {
      return value.replace(refPattern, (_, ref) => {
        const target = byKey.get(ref.trim());
        if (!target) {
          warnings.push(`Unresolved reference "{${ref}}" in ${entry.key}`);
          return `{${ref}}`;
        }
        return String(resolveLiteral(target, [...stack, entry.key]));
      });
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, String(resolveLiteral({ key: `${entry.key}.${k}`, value: v, type: null }, [...stack, entry.key]))]),
      );
    }
    return String(value);
  };

  for (const entry of entries) {
    if (!hasRef(entry.value)) continue;
    for (const match of entry.value.matchAll(refPattern)) {
      if (!byKey.has(match[1].trim())) warnings.push(`Unresolved reference "{${match[1]}}" in ${entry.key}`);
    }
  }

  const formatValue = (entry) => {
    const value = entry.value;
    if (entry.type === 'color') {
      const formatted = formatColor(resolveLiteral(entry), options.colorFormat);
      if (!formatted) warnings.push(`Could not parse color "${value}" in ${entry.key}`);
      return formatted ?? String(value);
    }
    if (entry.type === 'custom-shadow' && value && typeof value === 'object') {
      return shadowToCss(resolveLiteral(entry), options.colorFormat);
    }
    if (entry.type === 'dimension') return formatDimension(value);
    if (entry.type === 'number') return String(value);
    if (entry.type === 'string') return String(value);
    if (typeof value === 'object' && value !== null) {
      if ('radius' in value && 'color' in value) return shadowToCss(value, options.colorFormat);
      return String(value);
    }
    return String(value);
  };

  const aliasTarget = (entry) => {
    const ref = singleRef(entry.value);
    if (!ref) return null;
    const target = byKey.get(ref);
    if (!target || !varNameByKey.has(ref)) return null;
    if (['typography', 'effect'].includes(target.path[0])) return null;
    if (target.value && typeof target.value === 'object' && !Array.isArray(target.value)) return null;
    return varNameByKey.get(ref);
  };

  const declaration = (entry, { alias = false, comment = null } = {}) => {
    const name = varNameByKey.get(entry.key);
    const target = alias ? aliasTarget(entry) : null;
    const value = target ? `var(${target})` : formatValue(entry);
    const note = comment && target ? comment : null;
    return `  ${name}: ${value};${note ? ` /* ${note} */` : ''}`;
  };

  const lines = [];

  const group = (name, body) => {
    if (!body.length) return;
    lines.push('');
    lines.push(`  /* ${name} */`);
    lines.push(...body);
  };

  const primitives = entries.filter((e) => e.path[0] === 'primitives');
  const roles = entries.filter((e) => e.path[0] === 'color roles');
  const effects = entries.filter((e) => e.path[0] === 'effect');
  const typeStyles = entries.filter((e) => e.path[0] === 'typography');

  if (!primitives.length || !roles.length) {
    throw new Error('Expected both "primitives" and "color roles" in the token file');
  }

  const darkRoles = roles.filter((entry) => String(entry.path[1] ?? '').includes('dark'));
  const rolesByValue = new Map();
  for (const entry of roles) {
    const value = formatValue(entry);
    if (!rolesByValue.has(value)) rolesByValue.set(value, []);
    rolesByValue.get(value).push(varNameByKey.get(entry.key));
  }
  const duplicateRoles = [...rolesByValue.entries()].filter(([, names]) => names.length > 1);

  lines.push(':root {');
  lines.push(`  /*`);
  lines.push(`   * ${options.prefix.toUpperCase()}-tokens - GENERATED FILE, DO NOT EDIT.`);
  lines.push(`   *`);
  lines.push(`   * Source of truth: ${relative(process.cwd(), options.tokens) || options.tokens}`);
  lines.push(`   * Regenerate:      node scripts/build-css-variables.mjs`);
  lines.push(`   * Verify in CI:    node scripts/build-css-variables.mjs --check`);
  lines.push(`   *`);
  lines.push(`   * Layers, in order of reference:`);
  lines.push(`   *   --${options.prefix}-ref-*    raw palettes. Internal plumbing only.`);
  lines.push(`   *                          Never reference these from UI code;`);
  lines.push(`   *                          the --${options.prefix}-color-* roles below are the UI contract.`);
  lines.push(`   *   --${options.prefix}-color-*  color roles. The only color layer UI code may use.`);
  lines.push(`   *   --${options.prefix}-effect-* shadows.`);
  lines.push(`   *   --${options.prefix}-text-*   typography styles, plus a "font" shorthand per style.`);
  if (appliedFixes.size) {
    lines.push(`   *`);
    lines.push(`   * Renamed on export from Figma (typo corrected in the variable name only):`);
    for (const fix of appliedFixes) lines.push(`   *   ${fix}`);
  }
  if (duplicateRoles.length) {
    lines.push(`   *`);
    lines.push(`   * Roles that share one primitive value, as authored in Figma:`);
    for (const [value, names] of duplicateRoles) {
      lines.push(`   *   ${value}: ${names.join(', ')}`);
    }
  }
  if (!darkRoles.length) {
    lines.push(`   *`);
    lines.push(`   * No dark scheme roles exist in the source. Adding them in Figma and`);
    lines.push(`   * regenerating is the only way to get a dark theme.`);
  }
  lines.push(`   */`);

  group(
    'Primitives: key colors and palettes (internal, do not reference from UI code)',
    primitives.map((entry) => declaration(entry, { alias: true, comment: entry.key })),
  );

  group(
    'Color roles: the UI contract, the only color layer UI code may use',
    roles.map((entry) => declaration(entry, { alias: true, comment: formatValue(entry) })),
  );

  const effectLines = [];
  for (const entry of effects) {
    const base = varNameByKey.get(entry.key);
    if (entry.type === 'custom-shadow' && entry.value && typeof entry.value === 'object') {
      const { offsetX, offsetY, radius, spread, color } = resolveLiteral(entry);
      effectLines.push(`  ${base}: ${formatValue(entry)};`);
      effectLines.push(`  ${base}-offset-x: ${formatDimension(offsetX ?? 0)};`);
      effectLines.push(`  ${base}-offset-y: ${formatDimension(offsetY ?? 0)};`);
      effectLines.push(`  ${base}-blur: ${formatDimension(radius ?? 0)};`);
      effectLines.push(`  ${base}-spread: ${formatDimension(spread ?? 0)};`);
      effectLines.push(`  ${base}-color: ${formatColor(color, options.colorFormat) ?? String(color)};`);
    } else {
      effectLines.push(`  ${base}: ${formatValue(entry)};`);
    }
  }
  group('Effects: shadows', effectLines);

  const typeLines = [];
  for (const entry of typeStyles) {
    const base = varNameByKey.get(entry.key);
    if (!entry.value || typeof entry.value !== 'object') {
      typeLines.push(`  ${base}: ${formatValue(entry)};`);
      continue;
    }
    typeLines.push(`  /* ${base.replace(`--${options.prefix}-text-`, '')} */`);
    const parts = new Map();
    for (const [key, sub] of Object.entries(entry.value)) {
      const value = formatValue({ key: `${entry.key}.${key}`, value: rawValue(sub), type: rawType(sub) });
      if (key === 'textCase') {
        if (['uppercase', 'lowercase', 'capitalize'].includes(value)) {
          typeLines.push(`  ${base}-text-transform: ${value};`);
        } else if (value !== 'none') {
          warnings.push(`Unsupported textCase "${value}" in ${entry.key}; skipped`);
        }
        continue;
      }
      if ((key === 'paragraphIndent' || key === 'paragraphSpacing') && value === '0px') continue;
      parts.set(key, value);
      typeLines.push(`  ${base}-${TYPOGRAPHY_SUBPROPERTIES.get(key) ?? slug(key)}: ${value};`);
    }
    const size = parts.get('fontSize');
    const lineHeight = parts.get('lineHeight');
    const family = parts.get('fontFamily');
    if (size && lineHeight && family) {
      const shorthand = [
        parts.get('fontStretch') && parts.get('fontStretch') !== 'normal' ? parts.get('fontStretch') : null,
        parts.get('fontStyle') && parts.get('fontStyle') !== 'normal' ? parts.get('fontStyle') : null,
        parts.get('fontWeight'),
        `${size}/${lineHeight}`,
        family,
      ].filter(Boolean).join(' ');
      typeLines.push(`  ${base}: ${shorthand};`);
    }
  }
  group(`Typography: --${options.prefix}-text-<style> is a font shorthand, the suffixed vars are its parts`, typeLines);

  lines.push('}');
  const css = `${lines.join('\n')}\n`;

  return { css, entries, varNameByKey, byKey, resolveLiteral, formatValue, warnings, varNames: new Set(varNameByKey.values()) };
}

function validate(css, varNames) {
  const problems = [];
  const declared = new Set();
  const seen = new Set();
  for (const line of css.split('\n')) {
    const match = /^\s*(--[\w-]+)\s*:\s*(.+?);/.exec(line);
    if (!match) continue;
    if (seen.has(match[1])) problems.push(`Duplicate declaration of ${match[1]}`);
    seen.add(match[1]);
    declared.add(match[1]);
  }
  for (const name of varNames) {
    if (!declared.has(name)) problems.push(`Token ${name} was not emitted`);
  }
  for (const match of css.matchAll(/var\((--[\w-]+)/g)) {
    if (!declared.has(match[1])) problems.push(`Reference to undefined variable ${match[1]}`);
  }
  return problems;
}

function audit(model, prefix) {
  const varNameByKey = model.varNameByKey;
  const byKey = model.byKey;
  const roleValue = new Map();
  for (const [key, name] of varNameByKey) {
    if (key.startsWith('color roles.')) roleValue.set(name, model.formatValue({ key, value: model.byKey.get(key).value, type: 'color' }));
  }
  const pairs = [];
  for (const family of ROLE_FAMILIES) {
    for (const [a, b] of [
      [family, `on ${family}`],
      [`${family} container`, `on ${family} container`],
      [`${family} fixed`, `on ${family} fixed`],
      [`${family} fixed dim`, `on ${family} fixed variant`],
    ]) pairs.push([a, b]);
  }
  pairs.push(
    ['surface', 'on surface'],
    ['surface variant', 'on surface variant'],
    ['surface dim', 'on surface'],
    ['surface bright', 'on surface'],
    ['surface container', 'on surface'],
    ['surface container highest', 'on surface'],
    ['background', 'on background'],
    ['inverse surface', 'inverse on surface'],
  );

  const rows = [];
  for (const [fg, bg] of pairs) {
    const fgName = `--${prefix}-color-${slug(ROLE_NAME_FIXES.get(fg) ?? fg)}`;
    const bgName = `--${prefix}-color-${slug(ROLE_NAME_FIXES.get(bg) ?? bg)}`;
    if (!roleValue.has(fgName) || !roleValue.has(bgName)) continue;
    const fgColor = parseColor(roleValue.get(fgName));
    const bgColor = parseColor(roleValue.get(bgName));
    if (!fgColor || !bgColor) continue;
    const ratio = contrastRatio(fgColor, bgColor);
    rows.push({
      pair: `${fgName} on ${bgName}`,
      fg: roleValue.get(fgName),
      bg: roleValue.get(bgName),
      ratio,
      large: /fixed|container|variant|outline/.test(fgName),
    });
  }
  rows.sort((a, b) => a.ratio - b.ratio);

  const lines = ['', 'Contrast report (WCAG 2.1 relative luminance)'];
  for (const row of rows) {
    const pass = row.large ? 3 : 4.5;
    const mark = row.ratio >= pass ? 'pass' : 'FAIL';
    lines.push(`  ${mark}  ${row.ratio.toFixed(2).padStart(5)}: 1  (min ${pass})  ${row.fg} on ${row.bg}`);
  }
  const failures = rows.filter((row) => row.ratio < (row.large ? 3 : 4.5));
  if (failures.length) lines.push(`  ${failures.length} pairing(s) below target.`);
  lines.push('');
  return lines.join('\n');
}

function walkFiles(target, acc) {
  let stats;
  try {
    stats = statSync(target);
  } catch {
    return acc;
  }
  if (stats.isFile()) {
    acc.push(target);
    return acc;
  }
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    walkFiles(join(target, entry.name), acc);
  }
  return acc;
}

function guard(options) {
  const pattern = new RegExp(`var\\(\\s*--${options.prefix}-ref-`, 'g');
  const generated = resolve(options.out);
  const hits = [];
  for (const file of options.guard.flatMap((target) => walkFiles(target, []))) {
    if (!/\.(css|scss|sass|less|styl|jsx|tsx|js|ts|mjs|cjs|html|vue|svelte)$/i.test(file)) continue;
    if (resolve(file) === generated) continue;
    const source = readFileSync(file, 'utf8');
    source.split('\n').forEach((line, index) => {
      pattern.lastIndex = 0;
      if (pattern.test(line)) hits.push(`${file}:${index + 1}`);
    });
  }
  return hits;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n${HELP}`);
    process.exitCode = 2;
    return;
  }
  if (options.flags.has('help')) {
    process.stdout.write(HELP);
    return;
  }

  let model;
  try {
    model = build(options);
  } catch (error) {
    process.stderr.write(`Token build failed: ${error.message}\n`);
    process.exitCode = 1;
    return;
  }

  const { css, warnings, varNames } = model;

  const problems = validate(css, varNames);
  for (const problem of problems) process.stderr.write(`error: ${problem}\n`);
  if (problems.length) process.exitCode = 1;

  if (options.flags.has('audit')) process.stderr.write(`${audit(model, options.prefix)}\n`);

  if (options.flags.has('check')) {
    let existing = null;
    try {
      existing = readFileSync(options.out, 'utf8');
    } catch {
      process.stderr.write(`Missing ${options.out}. Run: node scripts/build-css-variables.mjs\n`);
      process.exitCode = 1;
      return;
    }
    if (existing !== css) {
      process.stderr.write(`${options.out} is out of date with ${options.tokens}. Run: node scripts/build-css-variables.mjs\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`${options.out} is up to date.\n`);
  } else if (options.flags.has('stdout')) {
    process.stdout.write(css);
  } else {
    mkdirSync(dirname(options.out), { recursive: true });
    writeFileSync(options.out, css, 'utf8');
    process.stdout.write(`Wrote ${options.out} (${model.entries.length} tokens).\n`);
  }

  for (const warning of warnings) process.stderr.write(`warning: ${warning}\n`);

  if (options.flags.has('guard')) {
    const hits = guard(options);
    for (const hit of hits) {
      process.stderr.write(`error: primitive token used in UI code at ${hit}. Use --${options.prefix}-color-* roles instead.\n`);
    }
    if (hits.length) process.exitCode = 1;
  }

  if (warnings.length && options.flags.has('strict')) process.exitCode = 1;
}

main();
