/// <reference types="@types/google.maps" />

declare global {
  interface Window {
    google: typeof google
  }

  namespace google.maps {
    // Extend if needed
  }
}

declare module '@googlemaps/js-api-loader' {
  interface Loader {
    load(): Promise<typeof google>
  }
}

export {}
