import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
export function CodeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null),
    callback = useRef(onChange);
  callback.current = onChange;
  useEffect(() => {
    const editor = new EditorView({
      parent: root.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          markdown(),
          EditorView.lineWrapping,
          placeholder("Araştırmanızı veya senaryonuzu buraya yazın…"),
          EditorView.contentAttributes.of({
            "aria-label": "Markdown doküman içeriği",
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged)
              callback.current(update.state.doc.toString());
          }),
          EditorView.theme({
            "&": { fontSize: "14px" },
            ".cm-content": {
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              padding: "20px",
              minHeight: "440px",
            },
            ".cm-scroller": { overflow: "auto" },
            "&.cm-focused": { outline: "none" },
            ".cm-cursor": { borderLeftColor: "#236d63" },
            ".cm-selectionBackground": {
              backgroundColor: "#d5e9e3 !important",
            },
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, []);
  useEffect(() => {
    const e = view.current;
    if (e && value !== e.state.doc.toString())
      e.dispatch({
        changes: { from: 0, to: e.state.doc.length, insert: value },
      });
  }, [value]);
  return <div className="code-editor" ref={root} />;
}
