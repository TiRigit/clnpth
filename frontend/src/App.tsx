import { useState } from "react";
import type { ScreenId } from "./types";
import { AccessibilityContext, useAccessibilityProvider } from "./hooks/useAccessibility";
import { useQueueStats } from "./hooks/useArticles";
import Nav from "./components/Nav";
import InputScreen from "./screens/InputScreen";
import ReviewScreen from "./screens/ReviewScreen";
import QueueScreen from "./screens/QueueScreen";
import ArchiveScreen from "./screens/ArchiveScreen";
import SupervisorScreen from "./screens/SupervisorScreen";

export default function App() {
  const [screen, setScreen] = useState<ScreenId>("input");
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const a11y = useAccessibilityProvider();
  const { stats } = useQueueStats();

  const handleSubmit = () => setScreen("queue");

  const handleOpenReview = (id: number) => {
    setSelectedArticleId(id);
    setScreen("review");
  };

  const counts: Partial<Record<ScreenId, number>> = {
    review: stats?.review ?? 0,
    queue: stats?.total ?? 0,
  };

  return (
    <AccessibilityContext.Provider value={a11y}>
      <a href="#main-content" className="skip-link">
        Zum Hauptinhalt
      </a>
      <a href="#nav" className="skip-link">
        Zur Navigation
      </a>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <Nav active={screen} setActive={setScreen} counts={counts} />
        <main
          id="main-content"
          role="main"
          style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
        >
          {screen === "input" && <InputScreen onSubmit={handleSubmit} />}
          {screen === "review" && selectedArticleId !== null && (
            <ReviewScreen articleId={selectedArticleId} />
          )}
          {screen === "queue" && (
            <QueueScreen onOpenReview={handleOpenReview} />
          )}
          {screen === "archive" && <ArchiveScreen />}
          {screen === "supervisor" && <SupervisorScreen />}
        </main>
      </div>
    </AccessibilityContext.Provider>
  );
}
