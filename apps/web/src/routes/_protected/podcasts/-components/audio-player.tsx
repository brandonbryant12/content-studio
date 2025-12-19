export function AudioPlayer({ url }: { url: string }) {
  return (
    <audio
      controls
      className="w-full h-10"
      src={url}
    >
      Your browser does not support the audio element.
    </audio>
  );
}
