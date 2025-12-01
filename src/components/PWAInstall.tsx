import { useEffect, useState } from "react";

export default function PWAInstall() {
  const [promptEvent, setPromptEvent] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: any) => {
      e.preventDefault();
      setPromptEvent(e);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || !promptEvent) return null;

  return (
    <button
      className="btn"
      onClick={async () => {
        promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome !== "accepted") {
          // user dismissed — nothing to do
        }
      }}
      title="Install Mizzion"
    >
      Install
    </button>
  );
}
