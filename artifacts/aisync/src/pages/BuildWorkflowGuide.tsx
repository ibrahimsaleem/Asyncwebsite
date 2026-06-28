import { useEffect } from "react";

export default function BuildWorkflowGuide() {
  useEffect(() => {
    document.title = "Aisync — From Voice Prompt to a Live, Owned Web App";
  }, []);

  const basePath = import.meta.env.BASE_URL ? import.meta.env.BASE_URL.replace(/\/$/, "") : "";
  const srcPath = `${basePath}/workflow.html`.replace(/^\/\//, "/");

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0b0f17]">
      <iframe
        src={srcPath}
        title="Aisync Build Playbook Guide"
        className="w-full h-full border-none"
        style={{ width: "100%", height: "100vh", border: "none" }}
      />
    </div>
  );
}
