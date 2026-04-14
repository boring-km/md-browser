import { keymap } from "prosemirror-keymap";
import { history, undo, redo } from "prosemirror-history";
import {
  baseKeymap,
  toggleMark,
} from "prosemirror-commands";
import {
  inputRules,
  wrappingInputRule,
  textblockTypeInputRule,
  InputRule,
} from "prosemirror-inputrules";
import type { Plugin } from "prosemirror-state";
import { editorSchema } from "./schema";
import {
  liftListItem,
  sinkListItem,
  splitListItem,
} from "prosemirror-schema-list";

function headingRule(level: number): InputRule {
  const pattern = new RegExp(`^(#{${level}})\\s$`);
  return textblockTypeInputRule(pattern, editorSchema.nodes.heading, {
    level,
  });
}

function codeBlockRule(): InputRule {
  return textblockTypeInputRule(
    /^```([a-zA-Z]*)?\s$/,
    editorSchema.nodes.code_block,
    (match) => ({
      language: match[1] ?? "",
    }),
  );
}

function horizontalRuleRule(): InputRule {
  return new InputRule(/^---\s$/, (state, _match, start, end) => {
    return state.tr
      .delete(start, end)
      .insert(start, editorSchema.nodes.horizontal_rule.create());
  });
}

function buildInputRules(): Plugin {
  return inputRules({
    rules: [
      headingRule(1),
      headingRule(2),
      headingRule(3),
      headingRule(4),
      headingRule(5),
      headingRule(6),
      wrappingInputRule(/^\s*>\s$/, editorSchema.nodes.blockquote),
      wrappingInputRule(/^\s*[-*]\s$/, editorSchema.nodes.bullet_list),
      wrappingInputRule(
        /^\s*(\d+)\.\s$/,
        editorSchema.nodes.ordered_list,
        (match) => ({
          order: +match[1],
        }),
      ),
      codeBlockRule(),
      horizontalRuleRule(),
    ],
  });
}

function buildKeymap(): Plugin {
  return keymap({
    "Mod-z": undo,
    "Mod-Shift-z": redo,
    "Mod-b": toggleMark(editorSchema.marks.strong),
    "Mod-i": toggleMark(editorSchema.marks.em),
    "Mod-`": toggleMark(editorSchema.marks.code),
    Enter: splitListItem(editorSchema.nodes.list_item),
    Tab: sinkListItem(editorSchema.nodes.list_item),
    "Shift-Tab": liftListItem(editorSchema.nodes.list_item),
  });
}

export function buildPlugins(): readonly Plugin[] {
  return [buildInputRules(), buildKeymap(), keymap(baseKeymap), history()];
}
