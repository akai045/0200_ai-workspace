declare module "htmlhint" {
  export interface HTMLHintRule {
    id: string;
    description: string;
  }
  export interface HTMLHintMessage {
    type: "error" | "warning";
    message: string;
    line: number;
    col: number;
    rule: HTMLHintRule;
  }
  interface HTMLHintExports {
    HTMLHint: {
      verify(html: string, ruleset?: Record<string, unknown>): HTMLHintMessage[];
      defaultRuleset: Record<string, unknown>;
    };
  }
  // htmlhintはCJS専用パッケージでNodeのESM相互運用ではdefault importでしか取れないため、
  // named exportではなくdefault exportとして型宣言する。
  const htmlhint: HTMLHintExports;
  export default htmlhint;
}
