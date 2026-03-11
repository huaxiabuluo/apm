/**
 * cli-table3 类型声明
 *
 * 由于 cli-table3 没有提供 TypeScript 类型定义，这里提供基本类型声明
 */

declare module 'cli-table3' {
  type PrimitiveCell = string | number | boolean;

  interface ObjectCell {
    content?: string;
    colSpan?: number;
    rowSpan?: number;
    hAlign?: 'left' | 'center' | 'right';
    vAlign?: 'top' | 'center' | 'bottom';
    [key: string]: PrimitiveCell | undefined;
  }

  type Cell = PrimitiveCell | ObjectCell;

  interface TableOptions {
    head?: Cell[];
    chars?: {
      top?: string;
      'top-mid'?: string;
      'top-left'?: string;
      'top-left-mid'?: string;
      'top-right'?: string;
      'top-right-mid'?: string;
      bottom?: string;
      'bottom-mid'?: string;
      'bottom-left'?: string;
      'bottom-left-mid'?: string;
      'bottom-right'?: string;
      'bottom-right-mid'?: string;
      mid?: string;
      'left-mid'?: string;
      'mid-mid'?: string;
      'right-mid'?: string;
      left?: string;
      right?: string;
      middle?: string;
    };
    style?: {
      'padding-left'?: number;
      'padding-right'?: number;
      head?: string[];
      compact?: boolean;
      border?: string[];
    };
  }

  interface Table {
    push(row: Cell | Cell[]): void;
  }

  class Table {
    constructor(options?: TableOptions);
  }

  export = Table;
}
