type ConfirmDialogProps = {
  message: string
  buttonLabel: string
  onConfirm: () => void
  onCancel: () => void
  isWorking?: boolean
}

export function ConfirmDialog({ message, buttonLabel, onConfirm, onCancel, isWorking }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-5 shadow-xl">
        <p className="text-sm leading-6 text-stone-700">{message}</p>
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isWorking}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-red-900 text-sm font-black text-white shadow-sm hover:bg-red-950 disabled:bg-stone-300"
          >
            {isWorking ? 'Eliminando...' : buttonLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isWorking}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-md border border-stone-200 text-sm font-black text-stone-700 hover:bg-stone-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}