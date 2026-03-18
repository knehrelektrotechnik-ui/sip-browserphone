export function formatiereUhrzeit(datum: Date = new Date()): string {
  return datum.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function formatiereGespraechsdauer(sekunden: number): string {
  const sichereSekunden = Math.max(0, Math.floor(sekunden));
  const stunden = Math.floor(sichereSekunden / 3600);
  const minuten = Math.floor((sichereSekunden % 3600) / 60);
  const restSekunden = sichereSekunden % 60;

  const teile = [
    minuten.toString().padStart(2, "0"),
    restSekunden.toString().padStart(2, "0")
  ];

  if (stunden > 0) {
    teile.unshift(stunden.toString().padStart(2, "0"));
  }

  return teile.join(":");
}
