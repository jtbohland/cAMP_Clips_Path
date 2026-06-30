import { createBrowserRouter } from "react-router";

import { PageNotFound, RouteLoadError } from "@superblocksteam/library";

import RegisteredApp from "./App.js";

export const router = createBrowserRouter([
  {
    Component: RegisteredApp,
    errorElement: <RouteLoadError />,
    children: [
      {
        path: "/",
        index: true,
        lazy: () =>
          import("./pages/Library/index.js").then((mod) => ({
            Component: mod.default,
          })),
      },
      {
        path: "/library",
        lazy: () =>
          import("./pages/Library/index.js").then((mod) => ({
            Component: mod.default,
          })),
      },
      {
        path: "/watch/:clipId",
        lazy: () =>
          import("./pages/Watch/index.js").then((mod) => ({
            Component: mod.default,
          })),
      },
      {
        path: "/bonus-watch/:clipKey",
        lazy: () =>
          import("./pages/BonusWatch/index.js").then((mod) => ({
            Component: mod.default,
          })),
      },
      {
        path: "/clip/:clipId",
        lazy: () =>
          import("./pages/DeepLink/index.js").then((mod) => ({
            Component: mod.default,
          })),
      },
      {
        path: "/topic-gear/:topicKey/:clipId",
        lazy: () =>
          import("./pages/TopicGear/index.js").then((mod) => ({
            Component: mod.default,
          })),
      },
      {
        path: "/report/:clipId",
        lazy: () =>
          import("./pages/Report/index.js").then((mod) => ({
            Component: mod.default,
          })),
      },
      {
        path: "/xp",
        lazy: () =>
          import("./pages/XPlanation/index.js").then((mod) => ({
            Component: mod.default,
          })),
      },
      {
        path: "/admin",
        lazy: () =>
          import("./pages/Admin/index.js").then((mod) => ({
            Component: mod.default,
          })),
      },
      {
        path: "/analytics",
        lazy: () =>
          import("./pages/Analytics/index.js").then((mod) => ({
            Component: mod.default,
          })),
      },
      {
        path: "/podcasts",
        lazy: () =>
          import("./pages/Podcasts/index.js").then((mod) => ({
            Component: mod.default,
          })),
      },
      {
        path: "/feedback",
        lazy: () =>
          import("./pages/ManagerFeedback/index.js").then((mod) => ({
            Component: mod.default,
          })),
      },
      {
        path: "/modal-museum",
        lazy: () =>
          import("./pages/ModalMuseum/index.js").then((mod) => ({
            Component: mod.default,
          })),
      },
      {
        path: "*",
        Component: () => (
          <PageNotFound
            title="Page not found"
            errorMessage="Content not found"
            buttonPath="/"
            buttonText="Return to Clip Library"
          />
        ),
      },
    ],
  },
]);
