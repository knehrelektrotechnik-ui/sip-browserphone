import { ProtokollEintrag, ProtokollEbene } from "../typen";
import { formatiereUhrzeit } from "./zeit";

type ProtokollBeobachter = () => void;

export class Protokollspeicher {
  private readonly eintraege: ProtokollEintrag[] = [];
  private readonly beobachter = new Set<ProtokollBeobachter>();
  private laufendeId = 1;

  public abonnieren(beobachter: ProtokollBeobachter): () => void {
    this.beobachter.add(beobachter);
    return () => {
      this.beobachter.delete(beobachter);
    };
  }

  public alleEintraege(): ProtokollEintrag[] {
    return [...this.eintraege];
  }

  public leeren(): void {
    this.eintraege.length = 0;
    this.benachrichtige();
  }

  public hinzufuegen(
    bereich: ProtokollEintrag["bereich"],
    nachricht: string,
    ebene: ProtokollEbene = "info",
    details?: string
  ): void {
    const eintrag: ProtokollEintrag = {
      id: this.laufendeId++,
      zeitstempel: formatiereUhrzeit(),
      bereich,
      ebene,
      nachricht,
      details
    };

    this.eintraege.unshift(eintrag);

    if (this.eintraege.length > 300) {
      this.eintraege.length = 300;
    }

    this.benachrichtige();
  }

  private benachrichtige(): void {
    for (const beobachter of this.beobachter) {
      beobachter();
    }
  }
}
