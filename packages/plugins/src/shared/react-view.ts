import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { ViewFactory, ViewState } from "@noteriv/plugin-api";

/**
 * A plugin view rendered with React. Core plugins run inside the app and share its single React copy (react is a
 * peer dependency), so a view written as a component costs no extra bundle. The root is unmounted when the host
 * closes the view.
 */
export function reactView(render: (state: ViewState) => ReactNode): ViewFactory {
  return () => ({
    mount(container, state) {
      const root = createRoot(container);
      root.render(render(state));
      // Closing usually starts inside one of the view's own event handlers, while React is still dispatching it;
      // unmounting synchronously there is not allowed, so it waits for the next task.
      return () => void setTimeout(() => root.unmount(), 0);
    },
  });
}
