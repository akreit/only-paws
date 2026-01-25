import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])

  function addNotification(notification: Omit<Notification, 'id'>) {
    const id = `notification-${Date.now()}-${Math.random()}`
    const newNotification: Notification = {
      id,
      ...notification,
      duration: notification.duration || 5000,
    }
    notifications.value.push(newNotification)

    if (newNotification.duration) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.duration)
    }
  }

  function removeNotification(id: string) {
    const index = notifications.value.findIndex((n) => n.id === id)
    if (index !== -1) {
      notifications.value.splice(index, 1)
    }
  }

  function success(message: string, duration?: number) {
    addNotification({ type: 'success', message, duration })
  }

  function error(message: string, duration?: number) {
    addNotification({ type: 'error', message, duration })
  }

  function warning(message: string, duration?: number) {
    addNotification({ type: 'warning', message, duration })
  }

  function info(message: string, duration?: number) {
    addNotification({ type: 'info', message, duration })
  }

  return {
    notifications,
    addNotification,
    removeNotification,
    success,
    error,
    warning,
    info,
  }
})

