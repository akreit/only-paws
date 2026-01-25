// Common UI component types

export interface SelectOption {
  label: string
  value: string | number
}

export interface BaseInputProps {
  id?: string
  label?: string
  disabled?: boolean
  required?: boolean
  error?: string
  hint?: string
}

export interface InputProps extends BaseInputProps {
  modelValue?: string | number
  type?: string
  placeholder?: string
}

export interface SelectProps extends BaseInputProps {
  modelValue?: string | number
  options: SelectOption[]
  placeholder?: string
}

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
}

export interface RatingProps {
  modelValue: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean
}

export interface ModalProps {
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}
