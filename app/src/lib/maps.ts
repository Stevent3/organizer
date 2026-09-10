// Route öffnen (M13 E1): Ort eines Termins in Apple Karten (iOS) bzw. der Karten-Website öffnen.

const PLACE_HINT = /\d|,|straße|strasse|str\.|platz|weg\b|allee|bahnhof|hbf|uni|campus|café|cafe|bar\b|club|halle|park|kino|praxis|zentrum|markt/i
const NOT_PLACE = /https?:\/\/|teams|zoom|meet\.|skype|telefon|anruf|call\b|online/i

/** Sieht die Notiz nach einer Adresse oder einem Ort aus? Links und Online-Meetings nicht. */
export function looksLikePlace(sub: string | undefined, fromCalendar = false): boolean {
  const s = (sub ?? '').trim()
  if (!s || NOT_PLACE.test(s)) return false
  return fromCalendar || PLACE_HINT.test(s)
}

/** Apple-Karten-Link; auf dem iPhone öffnet er die Karten-App, sonst die Website */
export function mapsUrl(place: string): string {
  return 'https://maps.apple.com/?q=' + encodeURIComponent(place.trim().replace(/\s+/g, ' '))
}
