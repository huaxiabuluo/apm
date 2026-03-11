/**
 * APM Logo 显示模块
 */

// ANSI 颜色代码
export const RESET = '\x1b[0m';
// 256-color middle grays - visible on both light and dark backgrounds
export const GRAYS = [
  '\x1b[38;5;250m', // lighter gray
  '\x1b[38;5;248m',
  '\x1b[38;5;245m', // mid gray
  '\x1b[38;5;243m',
  '\x1b[38;5;240m',
  '\x1b[38;5;238m', // darker gray
];

export const APM_LOGO_LINES = [
  ' █████╗ ██████╗ ███╗   ███╗',
  '██╔══██╗██╔══██╗████╗ ████║',
  '███████║██████╔╝██╔████╔██║',
  '██╔══██║██╔═══╝ ██║╚██╔╝██║',
  '██║  ██║██║     ██║ ╚═╝ ██║',
  '╚═╝  ╚═╝╚═╝     ╚═╝     ╚═╝',
];

/**
 * 显示 APM LOGO
 */
export function showLogo(): void {
  console.log();
  APM_LOGO_LINES.forEach((line, i) => {
    console.log(`${GRAYS[i % GRAYS.length]}${line}${RESET}`);
  });
  console.log();
}
