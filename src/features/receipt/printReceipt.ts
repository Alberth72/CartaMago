export function printReceipt() {
  if (typeof window === 'undefined') return

  const receipt = document.querySelector('.receipt-print-area')
  if (!receipt) {
    window.print()
    return
  }

  const clone = receipt.cloneNode(true) as HTMLElement
  clone.classList.add('receipt-print-clone')
  clone.querySelectorAll('.no-print').forEach((element) => element.remove())
  document.body.appendChild(clone)

  const root = document.documentElement
  root.classList.add('receipt-print-mode')

  const cleanup = () => {
    root.classList.remove('receipt-print-mode')
    clone.remove()
    window.removeEventListener('afterprint', cleanup)
  }

  window.addEventListener('afterprint', cleanup)
  window.print()
  window.setTimeout(cleanup, 1000)
}
