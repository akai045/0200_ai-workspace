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
  export const HTMLHint: {
    verify(html: string, ruleset?: Record<string, unknown>): HTMLHintMessage[];
    defaultRuleset: Record<string, unknown>;
  };
}
