type Props = { filename: string; data: unknown };

export default function DownloadDataButton({ filename, data }: Props) {
  function onDownload() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "data.json";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }
  return (
    <button className="btn" onClick={onDownload}>
      Export data (.json)
    </button>
  );
}
