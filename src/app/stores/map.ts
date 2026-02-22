import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMapStore = defineStore('map', () => {
  const config = useRuntimeConfig()

  const center = ref({
    lat: Number(config.public.googleMapsDefaultLat),
    lng: Number(config.public.googleMapsDefaultLng),
  })
  const zoom = ref(Number(config.public.googleMapsDefaultZoom))
  const bounds = ref<google.maps.LatLngBounds | null>(null)
  const mapInstance = ref<google.maps.Map | null>(null)

  function setCenter(newCenter: { lat: number; lng: number }) {
    center.value = newCenter
  }

  function setZoom(newZoom: number) {
    zoom.value = newZoom
  }

  function setBounds(newBounds: google.maps.LatLngBounds | null) {
    bounds.value = newBounds
  }

  function setMapInstance(instance: google.maps.Map | null) {
    mapInstance.value = instance
  }

  function panTo(lat: number, lng: number) {
    center.value = { lat, lng }
    if (mapInstance.value) {
      mapInstance.value.panTo({ lat, lng })
    }
  }

  function fitBounds(newBounds: google.maps.LatLngBounds) {
    bounds.value = newBounds
    if (mapInstance.value) {
      mapInstance.value.fitBounds(newBounds)
    }
  }

  return {
    center,
    zoom,
    bounds,
    mapInstance,
    setCenter,
    setZoom,
    setBounds,
    setMapInstance,
    panTo,
    fitBounds,
  }
})
