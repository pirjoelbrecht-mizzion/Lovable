// src/i18n/strings.ts
export type Dict = Record<string, string>;

/** ── English (US) ───────────────────────────────────────────── */
export const STRINGS_EN: Dict = {
  "settings.title": "App Settings",
  "settings.units": "Preferred Units",
  "settings.units.metric": "Metric (km)",
  "settings.units.imperial": "Imperial (miles)",
  "settings.language": "Language",

  "settings.connect": "Connect Devices / Services",
  "settings.deviceComing":
    "These are mock connections for now. They toggle on/off and persist locally so you can test flows.",

  "settings.voice.title": "Coach Voice Test",
  "settings.voice.desc":
    "This uses your browser’s built-in voice. It will speak in your selected language where available.",
  "settings.voice.sample":
    "This is a test of the Mizzion coach voice. Keep most time in Zone 2 and enjoy your run!",
  "settings.voice.sampleLabel": "Sample text",
  "settings.voice.placeholder": "Type a short coaching line to hear it spoken out loud.",
  "settings.voice.test": "Test voice",
  "settings.voice.currentLang": "Voice language",
  "settings.voice.playing": "Playing sample…",
  "settings.voice.unavailable":
    "Voice synthesis not available in this browser. Try Chrome on desktop.",

  "settings.conn.connected": "Connected",
  "settings.conn.disconnected": "Disconnected",
  "settings.conn.connect": "Connect",
  "settings.conn.disconnect": "Disconnect",
  "settings.conn.connectedStrava": "Connected to Strava",
  "settings.conn.connectedGarmin": "Connected to Garmin",
  "settings.conn.connectedApple": "Connected to Apple Health",
  "settings.conn.disconnectedStrava": "Disconnected Strava",
  "settings.conn.disconnectedGarmin": "Disconnected Garmin",
  "settings.conn.disconnectedApple": "Disconnected Apple Health",
  "settings.conn.disconnectAll": "Disconnect all",
  "settings.conn.disconnectedAll": "Disconnected all providers",

  "settings.danger.title": "Danger Zone",
  "settings.danger.desc":
    "Clear local data (streak, connections, preferences). This does not affect any cloud data.",
  "settings.danger.clear": "Clear local data",
  "settings.danger.cleared": "Local data cleared",

  // Coach box footer
  "coach.footer.lang": "Language",

  // Navigation (optional, if you wire it up later)
  "nav.dashboard": "Dashboard",
  "nav.log": "Log",
  "nav.insights": "Insights",
  "nav.planner": "Planner",
  "nav.settings": "Settings",
  "nav.auth": "Sign in",
};

/** ── Deutsch (DE) ───────────────────────────────────────────── */
export const STRINGS_DE: Dict = {
  "settings.title": "App-Einstellungen",
  "settings.units": "Bevorzugte Einheiten",
  "settings.units.metric": "Metrisch (km)",
  "settings.units.imperial": "Imperial (Meilen)",
  "settings.language": "Sprache",

  "settings.connect": "Geräte / Dienste verbinden",
  "settings.deviceComing":
    "Dies sind derzeit Mock-Verbindungen. Sie lassen sich an/aus schalten und lokal speichern, um Abläufe zu testen.",

  "settings.voice.title": "Coach-Sprachtest",
  "settings.voice.desc":
    "Verwendet die integrierte Sprachsynthese Ihres Browsers und spricht – wenn verfügbar – in der ausgewählten Sprache.",
  "settings.voice.sample":
    "Dies ist ein Test der Mizzion-Coach-Stimme. Verbringe die meiste Zeit in Zone 2 und genieße deinen Lauf!",
  "settings.voice.sampleLabel": "Beispieltext",
  "settings.voice.placeholder": "Kurze Coaching-Zeile eingeben, um sie laut vorlesen zu lassen.",
  "settings.voice.test": "Stimme testen",
  "settings.voice.currentLang": "Sprach-Locale",
  "settings.voice.playing": "Wiedergabe…",
  "settings.voice.unavailable":
    "Sprachsynthese ist in diesem Browser nicht verfügbar. Versuche Chrome am Desktop.",

  "settings.conn.connected": "Verbunden",
  "settings.conn.disconnected": "Getrennt",
  "settings.conn.connect": "Verbinden",
  "settings.conn.disconnect": "Trennen",
  "settings.conn.connectedStrava": "Mit Strava verbunden",
  "settings.conn.connectedGarmin": "Mit Garmin verbunden",
  "settings.conn.connectedApple": "Mit Apple Health verbunden",
  "settings.conn.disconnectedStrava": "Strava getrennt",
  "settings.conn.disconnectedGarmin": "Garmin getrennt",
  "settings.conn.disconnectedApple": "Apple Health getrennt",
  "settings.conn.disconnectAll": "Alle trennen",
  "settings.conn.disconnectedAll": "Alle Anbieter getrennt",

  "settings.danger.title": "Gefahrenbereich",
  "settings.danger.desc":
    "Lokale Daten löschen (Streak, Verbindungen, Einstellungen). Cloud-Daten sind nicht betroffen.",
  "settings.danger.clear": "Lokale Daten löschen",
  "settings.danger.cleared": "Lokale Daten gelöscht",

  "coach.footer.lang": "Sprache",

  "nav.dashboard": "Übersicht",
  "nav.log": "Protokoll",
  "nav.insights": "Insights",
  "nav.planner": "Planer",
  "nav.settings": "Einstellungen",
  "nav.auth": "Anmelden",
};

/** ── Français (FR) ──────────────────────────────────────────── */
export const STRINGS_FR: Dict = {
  "settings.title": "Paramètres de l’application",
  "settings.units": "Unités préférées",
  "settings.units.metric": "Métriques (km)",
  "settings.units.imperial": "Impériales (miles)",
  "settings.language": "Langue",

  "settings.connect": "Connecter des appareils / services",
  "settings.deviceComing":
    "Ce sont des connexions simulées pour l’instant. Elles se basculent ON/OFF et se conservent localement pour tester les flux.",

  "settings.voice.title": "Test de la voix du coach",
  "settings.voice.desc":
    "Utilise la synthèse vocale intégrée du navigateur. Parle dans la langue choisie lorsqu’elle est disponible.",
  "settings.voice.sample":
    "Ceci est un test de la voix du coach Mizzion. Passe la majorité du temps en Zone 2 et profite de ta course !",
  "settings.voice.sampleLabel": "Texte d’exemple",
  "settings.voice.placeholder":
    "Saisis une courte phrase de coaching pour l’entendre à voix haute.",
  "settings.voice.test": "Tester la voix",
  "settings.voice.currentLang": "Langue de la voix",
  "settings.voice.playing": "Lecture…",
  "settings.voice.unavailable":
    "Synthèse vocale indisponible sur ce navigateur. Essaie Chrome sur ordinateur.",

  "settings.conn.connected": "Connecté",
  "settings.conn.disconnected": "Déconnecté",
  "settings.conn.connect": "Connecter",
  "settings.conn.disconnect": "Déconnecter",
  "settings.conn.connectedStrava": "Connecté à Strava",
  "settings.conn.connectedGarmin": "Connecté à Garmin",
  "settings.conn.connectedApple": "Connecté à Apple Health",
  "settings.conn.disconnectedStrava": "Strava déconnecté",
  "settings.conn.disconnectedGarmin": "Garmin déconnecté",
  "settings.conn.disconnectedApple": "Apple Health déconnecté",
  "settings.conn.disconnectAll": "Tout déconnecter",
  "settings.conn.disconnectedAll": "Tous les services déconnectés",

  "settings.danger.title": "Zone à risque",
  "settings.danger.desc":
    "Effacer les données locales (streak, connexions, préférences). N’affecte pas les données cloud.",
  "settings.danger.clear": "Effacer les données locales",
  "settings.danger.cleared": "Données locales effacées",

  "coach.footer.lang": "Langue",

  "nav.dashboard": "Tableau de bord",
  "nav.log": "Journal",
  "nav.insights": "Insights",
  "nav.planner": "Planificateur",
  "nav.settings": "Paramètres",
  "nav.auth": "Connexion",
};

/** ── Español (ES) ───────────────────────────────────────────── */
export const STRINGS_ES: Dict = {
  "settings.title": "Ajustes de la app",
  "settings.units": "Unidades preferidas",
  "settings.units.metric": "Métricas (km)",
  "settings.units.imperial": "Imperiales (millas)",
  "settings.language": "Idioma",

  "settings.connect": "Conectar dispositivos / servicios",
  "settings.deviceComing":
    "Por ahora son conexiones simuladas. Se activan/desactivan y se guardan localmente para probar los flujos.",

  "settings.voice.title": "Prueba de voz del coach",
  "settings.voice.desc":
    "Usa la voz integrada del navegador. Hablará en el idioma seleccionado cuando esté disponible.",
  "settings.voice.sample":
    "Esta es una prueba de la voz del coach de Mizzion. Pasa la mayor parte del tiempo en Zona 2 y disfruta tu carrera.",
  "settings.voice.sampleLabel": "Texto de ejemplo",
  "settings.voice.placeholder": "Escribe una breve frase de coaching para oírla en voz alta.",
  "settings.voice.test": "Probar voz",
  "settings.voice.currentLang": "Idioma de la voz",
  "settings.voice.playing": "Reproduciendo…",
  "settings.voice.unavailable":
    "La síntesis de voz no está disponible en este navegador. Prueba Chrome en escritorio.",

  "settings.conn.connected": "Conectado",
  "settings.conn.disconnected": "Desconectado",
  "settings.conn.connect": "Conectar",
  "settings.conn.disconnect": "Desconectar",
  "settings.conn.connectedStrava": "Conectado a Strava",
  "settings.conn.connectedGarmin": "Conectado a Garmin",
  "settings.conn.connectedApple": "Conectado a Apple Health",
  "settings.conn.disconnectedStrava": "Strava desconectado",
  "settings.conn.disconnectedGarmin": "Garmin desconectado",
  "settings.conn.disconnectedApple": "Apple Health desconectado",
  "settings.conn.disconnectAll": "Desconectar todo",
  "settings.conn.disconnectedAll": "Todos los servicios desconectados",

  "settings.danger.title": "Zona peligrosa",
  "settings.danger.desc":
    "Borra los datos locales (racha, conexiones, preferencias). No afecta a los datos en la nube.",
  "settings.danger.clear": "Borrar datos locales",
  "settings.danger.cleared": "Datos locales borrados",

  "coach.footer.lang": "Idioma",

  "nav.dashboard": "Panel",
  "nav.log": "Registro",
  "nav.insights": "Insights",
  "nav.planner": "Planificador",
  "nav.settings": "Ajustes",
  "nav.auth": "Iniciar sesión",
};

/** ── Italiano (IT) ──────────────────────────────────────────── */
export const STRINGS_IT: Dict = {
  "settings.title": "Impostazioni app",
  "settings.units": "Unità preferite",
  "settings.units.metric": "Metrico (km)",
  "settings.units.imperial": "Imperiale (miglia)",
  "settings.language": "Lingua",

  "settings.connect": "Collega dispositivi / servizi",
  "settings.deviceComing":
    "Per ora sono connessioni simulate. Si attivano/disattivano e vengono salvate in locale per testare i flussi.",

  "settings.voice.title": "Test voce del coach",
  "settings.voice.desc":
    "Usa la sintesi vocale integrata del browser. Parlerà nella lingua selezionata quando disponibile.",
  "settings.voice.sample":
    "Questo è un test della voce del coach Mizzion. Trascorri la maggior parte del tempo in Zona 2 e goditi la corsa!",
  "settings.voice.sampleLabel": "Testo di esempio",
  "settings.voice.placeholder":
    "Scrivi una breve frase di coaching per sentirla letta ad alta voce.",
  "settings.voice.test": "Prova voce",
  "settings.voice.currentLang": "Lingua voce",
  "settings.voice.playing": "Riproduzione…",
  "settings.voice.unavailable":
    "Sintesi vocale non disponibile in questo browser. Prova Chrome su desktop.",

  "settings.conn.connected": "Connesso",
  "settings.conn.disconnected": "Disconnesso",
  "settings.conn.connect": "Connetti",
  "settings.conn.disconnect": "Disconnetti",
  "settings.conn.connectedStrava": "Connesso a Strava",
  "settings.conn.connectedGarmin": "Connesso a Garmin",
  "settings.conn.connectedApple": "Connesso ad Apple Health",
  "settings.conn.disconnectedStrava": "Strava disconnesso",
  "settings.conn.disconnectedGarmin": "Garmin disconnesso",
  "settings.conn.disconnectedApple": "Apple Health disconnesso",
  "settings.conn.disconnectAll": "Disconnetti tutto",
  "settings.conn.disconnectedAll": "Tutti i servizi disconnessi",

  "settings.danger.title": "Zona pericolosa",
  "settings.danger.desc":
    "Cancella i dati locali (streak, connessioni, preferenze). Non influisce sui dati nel cloud.",
  "settings.danger.clear": "Cancella dati locali",
  "settings.danger.cleared": "Dati locali cancellati",

  "coach.footer.lang": "Lingua",

  "nav.dashboard": "Bacheca",
  "nav.log": "Registro",
  "nav.insights": "Insights",
  "nav.planner": "Planner",
  "nav.settings": "Impostazioni",
  "nav.auth": "Accedi",
};

/** Registry of locales → dictionaries */
export const STRINGS_BY_LOCALE: Record<string, Dict> = {
  "en-US": STRINGS_EN,
  "de-DE": STRINGS_DE,
  "fr-FR": STRINGS_FR,
  "es-ES": STRINGS_ES,
  "it-IT": STRINGS_IT,
};
