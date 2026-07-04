import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMapStore = defineStore('map', () => {
  const center = ref<{ lat: number; lng: number } | null>(null)
  const zoom = ref(13)
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
