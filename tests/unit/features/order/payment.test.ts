import { describe, expect, it } from 'vitest'
import {
  getDefaultPaymentMethod,
  getInitialPaymentStatus,
  getPaymentProvider,
  normalizePaymentMethod,
  paymentMethodLabels,
  paymentMethodsByFulfillment,
} from '../../../../src/features/order/payment'

describe('payment', () => {
  it('returns the first allowed method as default per fulfillment', () => {
    expect(getDefaultPaymentMethod('pickup')).toBe('cash')
    expect(getDefaultPaymentMethod('didi_food')).toBe('didi_food')
  })

  it('normalizes an unknown method back to the default', () => {
    expect(normalizePaymentMethod('wompi', 'pickup')).toBe('wompi')
    expect(normalizePaymentMethod('rubbish', 'pickup')).toBe('cash')
  })

  it('keeps didi_food available only through its own channel', () => {
    expect(paymentMethodsByFulfillment.didi_food).toEqual(['didi_food'])
    expect(normalizePaymentMethod('didi_food', 'pickup')).toBe('cash')
  })

  it('maps the provider for online vs manual methods', () => {
    expect(getPaymentProvider('wompi')).toBe('wompi')
    expect(getPaymentProvider('didi_food')).toBe('didi_food')
    expect(getPaymentProvider('cash')).toBe('manual')
  })

  it('sets the initial payment status as pending for common methods', () => {
    expect(getInitialPaymentStatus('cash')).toBe('pending')
    expect(getInitialPaymentStatus('bank_transfer')).toBe('pending')
  })

  it('exposes Spanish labels for every method', () => {
    expect(paymentMethodLabels.cash).toBe('Efectivo')
    expect(paymentMethodLabels.wompi).toBe('Wompi online')
  })
})